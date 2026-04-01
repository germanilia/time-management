#!/usr/bin/env bash
set -euo pipefail

# =================================================================
# deploy.sh — Provision AWS infrastructure + deploy application
# Idempotent: safe to run multiple times.
# Usage: just deploy   (or: bash infra/deploy.sh)
#
# Architecture: single EC2 instance with PostgreSQL, behind ALB
# for HTTPS termination via ACM certificate.
# =================================================================

# -----------------------------------------------------------------
# Constants
# -----------------------------------------------------------------
export AWS_PROFILE=sela
export AWS_REGION=us-east-1
AWS_ACCOUNT=138182066483
CERT_ARN="arn:aws:acm:us-east-1:138182066483:certificate/6e9eb02f-3688-4be0-b4fe-15a34eac1860"
DOMAIN="time.bobthebot.io"
HOSTED_ZONE_ID="Z04861982PVM83JJV8MH"
INSTANCE_TYPE="t3.medium"
KEY_NAME="sela-time-mgmt"
TAG="sela-time-mgmt"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PEM_FILE="$REPO_ROOT/sela-time-mgmt.pem"
DEPLOY_DIR="$REPO_ROOT/deployment"
INFRA_DIR="$REPO_ROOT/infra"
SSH_USER="ec2-user"
SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 -i $PEM_FILE"

SUBNET_1_AZ="${AWS_REGION}a"
SUBNET_2_AZ="${AWS_REGION}b"

# -----------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------
aws_cmd() {
    aws --profile "$AWS_PROFILE" --region "$AWS_REGION" "$@"
}

log() {
    echo ""
    echo "====== $1 ======"
}

check_ssh() {
    local ip="$1"
    nc -z -w 5 "$ip" 22 &>/dev/null
}

wait_for_ssh() {
    local ip="$1"
    local label="$2"
    echo "Waiting for SSH on $label ($ip)..."
    for i in $(seq 1 60); do
        if check_ssh "$ip"; then
            echo "SSH ready on $label."
            return 0
        fi
        sleep 5
    done
    echo "ERROR: SSH not reachable on $label ($ip) after 5 minutes."
    exit 1
}

# -----------------------------------------------------------------
# Pre-flight checks
# -----------------------------------------------------------------
log "Pre-flight checks"

if ! command -v aws &>/dev/null; then
    echo "ERROR: AWS CLI not found. Install it first."
    exit 1
fi

# Verify credentials
CALLER_ACCOUNT=$(aws_cmd sts get-caller-identity --query Account --output text 2>/dev/null || true)
if [[ "$CALLER_ACCOUNT" != "$AWS_ACCOUNT" ]]; then
    echo "ERROR: AWS profile 'sela' resolved to account '$CALLER_ACCOUNT', expected '$AWS_ACCOUNT'."
    echo "Check your ~/.aws/credentials and ~/.aws/config."
    exit 1
fi
echo "AWS credentials OK (account: $AWS_ACCOUNT)"

mkdir -p "$DEPLOY_DIR"

# =================================================================
# PHASE 1: INFRASTRUCTURE (idempotent)
# =================================================================

# -----------------------------------------------------------------
# 1.1 VPC
# -----------------------------------------------------------------
log "VPC"

VPC_ID=$(aws_cmd ec2 describe-vpcs \
    --filters "Name=tag:Project,Values=$TAG" \
    --query "Vpcs[0].VpcId" --output text 2>/dev/null || echo "None")

if [[ "$VPC_ID" == "None" || -z "$VPC_ID" ]]; then
    echo "Creating VPC..."
    VPC_ID=$(aws_cmd ec2 create-vpc \
        --cidr-block 10.0.0.0/16 \
        --query "Vpc.VpcId" --output text)
    aws_cmd ec2 create-tags --resources "$VPC_ID" --tags "Key=Name,Value=$TAG-vpc" "Key=Project,Value=$TAG"
    aws_cmd ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-hostnames '{"Value":true}'
    aws_cmd ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-support '{"Value":true}'
    echo "Created VPC: $VPC_ID"
else
    echo "VPC exists: $VPC_ID"
fi

# -----------------------------------------------------------------
# 1.2 Internet Gateway
# -----------------------------------------------------------------
log "Internet Gateway"

IGW_ID=$(aws_cmd ec2 describe-internet-gateways \
    --filters "Name=tag:Project,Values=$TAG" \
    --query "InternetGateways[0].InternetGatewayId" --output text 2>/dev/null || echo "None")

if [[ "$IGW_ID" == "None" || -z "$IGW_ID" ]]; then
    echo "Creating Internet Gateway..."
    IGW_ID=$(aws_cmd ec2 create-internet-gateway \
        --query "InternetGateway.InternetGatewayId" --output text)
    aws_cmd ec2 create-tags --resources "$IGW_ID" --tags "Key=Name,Value=$TAG-igw" "Key=Project,Value=$TAG"
    aws_cmd ec2 attach-internet-gateway --internet-gateway-id "$IGW_ID" --vpc-id "$VPC_ID"
    echo "Created IGW: $IGW_ID"
else
    echo "IGW exists: $IGW_ID"
fi

# -----------------------------------------------------------------
# 1.3 Subnets (2 required for ALB, EC2 only in subnet-1)
# -----------------------------------------------------------------
log "Subnets"

SUBNET_1_ID=$(aws_cmd ec2 describe-subnets \
    --filters "Name=tag:Name,Values=$TAG-subnet-1" "Name=vpc-id,Values=$VPC_ID" \
    --query "Subnets[0].SubnetId" --output text 2>/dev/null || echo "None")

if [[ "$SUBNET_1_ID" == "None" || -z "$SUBNET_1_ID" ]]; then
    echo "Creating Subnet 1 ($SUBNET_1_AZ)..."
    SUBNET_1_ID=$(aws_cmd ec2 create-subnet \
        --vpc-id "$VPC_ID" --cidr-block 10.0.1.0/24 --availability-zone "$SUBNET_1_AZ" \
        --query "Subnet.SubnetId" --output text)
    aws_cmd ec2 create-tags --resources "$SUBNET_1_ID" --tags "Key=Name,Value=$TAG-subnet-1" "Key=Project,Value=$TAG"
    aws_cmd ec2 modify-subnet-attribute --subnet-id "$SUBNET_1_ID" --map-public-ip-on-launch
    echo "Created Subnet 1: $SUBNET_1_ID"
else
    echo "Subnet 1 exists: $SUBNET_1_ID"
fi

# Subnet 2 exists only because ALB requires subnets in 2 AZs — no EC2 here
SUBNET_2_ID=$(aws_cmd ec2 describe-subnets \
    --filters "Name=tag:Name,Values=$TAG-subnet-2" "Name=vpc-id,Values=$VPC_ID" \
    --query "Subnets[0].SubnetId" --output text 2>/dev/null || echo "None")

if [[ "$SUBNET_2_ID" == "None" || -z "$SUBNET_2_ID" ]]; then
    echo "Creating Subnet 2 ($SUBNET_2_AZ) — for ALB only, no EC2..."
    SUBNET_2_ID=$(aws_cmd ec2 create-subnet \
        --vpc-id "$VPC_ID" --cidr-block 10.0.2.0/24 --availability-zone "$SUBNET_2_AZ" \
        --query "Subnet.SubnetId" --output text)
    aws_cmd ec2 create-tags --resources "$SUBNET_2_ID" --tags "Key=Name,Value=$TAG-subnet-2" "Key=Project,Value=$TAG"
    aws_cmd ec2 modify-subnet-attribute --subnet-id "$SUBNET_2_ID" --map-public-ip-on-launch
    echo "Created Subnet 2: $SUBNET_2_ID"
else
    echo "Subnet 2 exists: $SUBNET_2_ID"
fi

# -----------------------------------------------------------------
# 1.4 Route Table
# -----------------------------------------------------------------
log "Route Table"

RTB_ID=$(aws_cmd ec2 describe-route-tables \
    --filters "Name=tag:Project,Values=$TAG" "Name=vpc-id,Values=$VPC_ID" \
    --query "RouteTables[0].RouteTableId" --output text 2>/dev/null || echo "None")

if [[ "$RTB_ID" == "None" || -z "$RTB_ID" ]]; then
    echo "Creating Route Table..."
    RTB_ID=$(aws_cmd ec2 create-route-table \
        --vpc-id "$VPC_ID" \
        --query "RouteTable.RouteTableId" --output text)
    aws_cmd ec2 create-tags --resources "$RTB_ID" --tags "Key=Name,Value=$TAG-rtb" "Key=Project,Value=$TAG"
    aws_cmd ec2 create-route --route-table-id "$RTB_ID" --destination-cidr-block 0.0.0.0/0 --gateway-id "$IGW_ID" >/dev/null
    aws_cmd ec2 associate-route-table --route-table-id "$RTB_ID" --subnet-id "$SUBNET_1_ID" >/dev/null
    aws_cmd ec2 associate-route-table --route-table-id "$RTB_ID" --subnet-id "$SUBNET_2_ID" >/dev/null
    echo "Created Route Table: $RTB_ID"
else
    echo "Route Table exists: $RTB_ID"
fi

# -----------------------------------------------------------------
# 1.5 Security Groups
# -----------------------------------------------------------------
log "Security Groups"

ALB_SG_ID=$(aws_cmd ec2 describe-security-groups \
    --filters "Name=group-name,Values=$TAG-alb-sg" "Name=vpc-id,Values=$VPC_ID" \
    --query "SecurityGroups[0].GroupId" --output text 2>/dev/null || echo "None")

if [[ "$ALB_SG_ID" == "None" || -z "$ALB_SG_ID" ]]; then
    echo "Creating ALB Security Group..."
    ALB_SG_ID=$(aws_cmd ec2 create-security-group \
        --group-name "$TAG-alb-sg" \
        --description "ALB security group for $TAG" \
        --vpc-id "$VPC_ID" \
        --query "GroupId" --output text)
    aws_cmd ec2 create-tags --resources "$ALB_SG_ID" --tags "Key=Name,Value=$TAG-alb-sg" "Key=Project,Value=$TAG"
    aws_cmd ec2 authorize-security-group-ingress --group-id "$ALB_SG_ID" \
        --protocol tcp --port 80 --cidr 0.0.0.0/0 >/dev/null
    aws_cmd ec2 authorize-security-group-ingress --group-id "$ALB_SG_ID" \
        --protocol tcp --port 443 --cidr 0.0.0.0/0 >/dev/null
    echo "Created ALB SG: $ALB_SG_ID"
else
    echo "ALB SG exists: $ALB_SG_ID"
fi

EC2_SG_ID=$(aws_cmd ec2 describe-security-groups \
    --filters "Name=group-name,Values=$TAG-ec2-sg" "Name=vpc-id,Values=$VPC_ID" \
    --query "SecurityGroups[0].GroupId" --output text 2>/dev/null || echo "None")

if [[ "$EC2_SG_ID" == "None" || -z "$EC2_SG_ID" ]]; then
    echo "Creating EC2 Security Group..."
    EC2_SG_ID=$(aws_cmd ec2 create-security-group \
        --group-name "$TAG-ec2-sg" \
        --description "EC2 security group for $TAG" \
        --vpc-id "$VPC_ID" \
        --query "GroupId" --output text)
    aws_cmd ec2 create-tags --resources "$EC2_SG_ID" --tags "Key=Name,Value=$TAG-ec2-sg" "Key=Project,Value=$TAG"
    # HTTP from ALB
    aws_cmd ec2 authorize-security-group-ingress --group-id "$EC2_SG_ID" \
        --protocol tcp --port 80 --source-group "$ALB_SG_ID" >/dev/null
    # Uvicorn from ALB
    aws_cmd ec2 authorize-security-group-ingress --group-id "$EC2_SG_ID" \
        --protocol tcp --port 8000 --source-group "$ALB_SG_ID" >/dev/null
    # SSH from anywhere
    aws_cmd ec2 authorize-security-group-ingress --group-id "$EC2_SG_ID" \
        --protocol tcp --port 22 --cidr 0.0.0.0/0 >/dev/null
    echo "Created EC2 SG: $EC2_SG_ID"
else
    echo "EC2 SG exists: $EC2_SG_ID"
fi

# -----------------------------------------------------------------
# 1.6 Key Pair
# -----------------------------------------------------------------
log "Key Pair"

KEY_EXISTS=$(aws_cmd ec2 describe-key-pairs --key-names "$KEY_NAME" --query "KeyPairs[0].KeyName" --output text 2>/dev/null || echo "None")

if [[ "$KEY_EXISTS" == "None" || -z "$KEY_EXISTS" ]]; then
    echo "Creating Key Pair..."
    aws_cmd ec2 create-key-pair \
        --key-name "$KEY_NAME" \
        --query "KeyMaterial" --output text > "$PEM_FILE"
    chmod 400 "$PEM_FILE"
    echo "Created key pair: $KEY_NAME (saved to $PEM_FILE)"
else
    echo "Key pair exists: $KEY_NAME"
    if [[ ! -f "$PEM_FILE" ]]; then
        echo "ERROR: Key pair '$KEY_NAME' exists in AWS but PEM file not found at $PEM_FILE."
        echo "Either recover the PEM file or delete the key pair and re-run:"
        echo "  aws ec2 delete-key-pair --key-name $KEY_NAME --profile $AWS_PROFILE --region $AWS_REGION"
        exit 1
    fi
fi

# -----------------------------------------------------------------
# 1.7 EC2 Instance
# -----------------------------------------------------------------
log "EC2 Instance"

# Get latest Amazon Linux 2023 AMI
AMI_ID=$(aws_cmd ssm get-parameters \
    --names /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
    --query "Parameters[0].Value" --output text)
echo "AMI: $AMI_ID"

INST_ID=$(aws_cmd ec2 describe-instances \
    --filters "Name=tag:Name,Values=$TAG-1" "Name=instance-state-name,Values=running,stopped" \
    --query "Reservations[0].Instances[0].InstanceId" --output text 2>/dev/null || echo "None")

if [[ "$INST_ID" == "None" || -z "$INST_ID" ]]; then
    echo "Launching instance in $SUBNET_1_AZ..."
    INST_ID=$(aws_cmd ec2 run-instances \
        --image-id "$AMI_ID" \
        --instance-type "$INSTANCE_TYPE" \
        --key-name "$KEY_NAME" \
        --security-group-ids "$EC2_SG_ID" \
        --subnet-id "$SUBNET_1_ID" \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$TAG-1},{Key=Project,Value=$TAG}]" \
        --query "Instances[0].InstanceId" --output text)
    echo "Launched: $INST_ID"
else
    echo "Instance exists: $INST_ID"
    # Ensure it's running
    STATE=$(aws_cmd ec2 describe-instances --instance-ids "$INST_ID" \
        --query "Reservations[0].Instances[0].State.Name" --output text)
    if [[ "$STATE" == "stopped" ]]; then
        echo "Starting stopped instance $INST_ID..."
        aws_cmd ec2 start-instances --instance-ids "$INST_ID" >/dev/null
    fi
fi

echo "Waiting for instance to be running..."
aws_cmd ec2 wait instance-running --instance-ids "$INST_ID"

INST_PRIVATE_IP=$(aws_cmd ec2 describe-instances --instance-ids "$INST_ID" \
    --query "Reservations[0].Instances[0].PrivateIpAddress" --output text)
echo "Instance: $INST_ID (private: $INST_PRIVATE_IP)"

# -----------------------------------------------------------------
# 1.8 Elastic IP
# -----------------------------------------------------------------
log "Elastic IP"

ALLOC_ID=$(aws_cmd ec2 describe-addresses \
    --filters "Name=instance-id,Values=$INST_ID" \
    --query "Addresses[0].AllocationId" --output text 2>/dev/null || echo "None")

if [[ "$ALLOC_ID" == "None" || -z "$ALLOC_ID" ]]; then
    # Check if we have a tagged but unassociated EIP
    ALLOC_ID=$(aws_cmd ec2 describe-addresses \
        --filters "Name=tag:Name,Values=$TAG-eip-1" \
        --query "Addresses[0].AllocationId" --output text 2>/dev/null || echo "None")

    if [[ "$ALLOC_ID" == "None" || -z "$ALLOC_ID" ]]; then
        echo "Allocating Elastic IP..."
        ALLOC_ID=$(aws_cmd ec2 allocate-address \
            --domain vpc \
            --query "AllocationId" --output text)
        aws_cmd ec2 create-tags --resources "$ALLOC_ID" \
            --tags "Key=Name,Value=$TAG-eip-1" "Key=Project,Value=$TAG"
    fi

    echo "Associating EIP $ALLOC_ID with $INST_ID..."
    aws_cmd ec2 associate-address --allocation-id "$ALLOC_ID" --instance-id "$INST_ID" >/dev/null
fi

INST_EIP=$(aws_cmd ec2 describe-addresses --allocation-ids "$ALLOC_ID" \
    --query "Addresses[0].PublicIp" --output text)

# Save instance metadata
cat > "$DEPLOY_DIR/instance.env" <<EOF
INSTANCE_ID=$INST_ID
ELASTIC_IP=$INST_EIP
PRIVATE_IP=$INST_PRIVATE_IP
ALLOCATION_ID=$ALLOC_ID
EOF

echo "EIP: $INST_EIP"

# -----------------------------------------------------------------
# 1.9 Target Group
# -----------------------------------------------------------------
log "Target Group"

TG_ARN=$(aws_cmd elbv2 describe-target-groups \
    --names "$TAG-tg" \
    --query "TargetGroups[0].TargetGroupArn" --output text 2>/dev/null || echo "None")

if [[ "$TG_ARN" == "None" || -z "$TG_ARN" ]]; then
    echo "Creating Target Group..."
    TG_ARN=$(aws_cmd elbv2 create-target-group \
        --name "$TAG-tg" \
        --protocol HTTP \
        --port 80 \
        --vpc-id "$VPC_ID" \
        --target-type instance \
        --health-check-path "/health" \
        --health-check-interval-seconds 30 \
        --healthy-threshold-count 2 \
        --unhealthy-threshold-count 3 \
        --query "TargetGroups[0].TargetGroupArn" --output text)
    echo "Created TG: $TG_ARN"
else
    echo "Target Group exists: $TG_ARN"
fi

# Register single target (idempotent)
echo "Registering target..."
aws_cmd elbv2 register-targets --target-group-arn "$TG_ARN" \
    --targets "Id=$INST_ID"

# -----------------------------------------------------------------
# 1.10 Application Load Balancer
# -----------------------------------------------------------------
log "Application Load Balancer"

ALB_ARN=$(aws_cmd elbv2 describe-load-balancers \
    --names "$TAG-alb" \
    --query "LoadBalancers[0].LoadBalancerArn" --output text 2>/dev/null || echo "None")

if [[ "$ALB_ARN" == "None" || -z "$ALB_ARN" ]]; then
    echo "Creating ALB..."
    ALB_ARN=$(aws_cmd elbv2 create-load-balancer \
        --name "$TAG-alb" \
        --type application \
        --scheme internet-facing \
        --subnets "$SUBNET_1_ID" "$SUBNET_2_ID" \
        --security-groups "$ALB_SG_ID" \
        --query "LoadBalancers[0].LoadBalancerArn" --output text)
    echo "Created ALB: $ALB_ARN"
    echo "Waiting for ALB to be active..."
    aws_cmd elbv2 wait load-balancer-available --load-balancer-arns "$ALB_ARN"
else
    echo "ALB exists: $ALB_ARN"
fi

ALB_DNS=$(aws_cmd elbv2 describe-load-balancers --load-balancer-arns "$ALB_ARN" \
    --query "LoadBalancers[0].DNSName" --output text)
ALB_ZONE_ID=$(aws_cmd elbv2 describe-load-balancers --load-balancer-arns "$ALB_ARN" \
    --query "LoadBalancers[0].CanonicalHostedZoneId" --output text)

echo "ALB DNS: $ALB_DNS"

# -----------------------------------------------------------------
# 1.11 Listeners
# -----------------------------------------------------------------
log "ALB Listeners"

# HTTPS listener
HTTPS_LISTENER=$(aws_cmd elbv2 describe-listeners --load-balancer-arn "$ALB_ARN" \
    --query "Listeners[?Port==\`443\`].ListenerArn | [0]" --output text 2>/dev/null || echo "None")

if [[ "$HTTPS_LISTENER" == "None" || -z "$HTTPS_LISTENER" ]]; then
    echo "Creating HTTPS listener..."
    aws_cmd elbv2 create-listener \
        --load-balancer-arn "$ALB_ARN" \
        --protocol HTTPS \
        --port 443 \
        --certificates "CertificateArn=$CERT_ARN" \
        --default-actions "Type=forward,TargetGroupArn=$TG_ARN" >/dev/null
    echo "HTTPS listener created."
else
    echo "HTTPS listener exists."
fi

# HTTP listener (redirect to HTTPS)
HTTP_LISTENER=$(aws_cmd elbv2 describe-listeners --load-balancer-arn "$ALB_ARN" \
    --query "Listeners[?Port==\`80\`].ListenerArn | [0]" --output text 2>/dev/null || echo "None")

if [[ "$HTTP_LISTENER" == "None" || -z "$HTTP_LISTENER" ]]; then
    echo "Creating HTTP->HTTPS redirect listener..."
    aws_cmd elbv2 create-listener \
        --load-balancer-arn "$ALB_ARN" \
        --protocol HTTP \
        --port 80 \
        --default-actions 'Type=redirect,RedirectConfig={Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' >/dev/null
    echo "HTTP redirect listener created."
else
    echo "HTTP listener exists."
fi

# -----------------------------------------------------------------
# 1.12 Route 53
# -----------------------------------------------------------------
log "Route 53"

echo "Upserting DNS record: $DOMAIN -> $ALB_DNS"
aws_cmd route53 change-resource-record-sets \
    --hosted-zone-id "$HOSTED_ZONE_ID" \
    --change-batch "{
        \"Changes\": [{
            \"Action\": \"UPSERT\",
            \"ResourceRecordSet\": {
                \"Name\": \"$DOMAIN\",
                \"Type\": \"A\",
                \"AliasTarget\": {
                    \"HostedZoneId\": \"$ALB_ZONE_ID\",
                    \"DNSName\": \"$ALB_DNS\",
                    \"EvaluateTargetHealth\": true
                }
            }
        }]
    }" >/dev/null
echo "DNS record upserted."

# =================================================================
# PHASE 2: APPLICATION DEPLOYMENT
# =================================================================

log "Generating secrets"

SECRETS_FILE="$DEPLOY_DIR/secrets.env"
if [[ ! -f "$SECRETS_FILE" ]]; then
    DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
    JWT_SECRET=$(openssl rand -base64 48 | tr -d '/+=' | head -c 64)
    cat > "$SECRETS_FILE" <<EOF
DB_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
EOF
    echo "Generated new secrets (saved to $SECRETS_FILE)"
else
    echo "Using existing secrets from $SECRETS_FILE"
fi

# shellcheck source=/dev/null
source "$SECRETS_FILE"

# -----------------------------------------------------------------
# Wait for SSH
# -----------------------------------------------------------------
log "Checking instance reachability"

wait_for_ssh "$INST_EIP" "Instance"

# -----------------------------------------------------------------
# Build frontend
# -----------------------------------------------------------------
log "Building frontend"

cd "$REPO_ROOT/client"
VITE_API_URL=/api npm run build
echo "Frontend built to client/dist/"

# -----------------------------------------------------------------
# Generate production config
# -----------------------------------------------------------------
log "Generating production config"

cat > /tmp/sela-prod-env.yml <<EOF
database:
  host: localhost
  port: 5432

cors:
  origins:
    - "https://$DOMAIN"
EOF

cat > /tmp/sela-prod-secrets.yml <<EOF
database:
  user: postgres
  password: "$DB_PASSWORD"

jwt:
  secret_key: "$JWT_SECRET"
EOF

# -----------------------------------------------------------------
# Create deployment tarball
# -----------------------------------------------------------------
log "Creating deployment tarball"

cd "$REPO_ROOT"
COPYFILE_DISABLE=1 tar czf /tmp/sela-deploy.tar.gz \
    --exclude=node_modules \
    --exclude=.venv \
    --exclude=.git \
    --exclude=__pycache__ \
    --exclude=.pytest_cache \
    --exclude=client/dist \
    --exclude='*.pem' \
    --exclude=deployment \
    --exclude='._*' \
    --exclude='*.pyc' \
    -C "$REPO_ROOT" \
    backend config infra justfile

echo "Tarball created."

# -----------------------------------------------------------------
# Deploy to instance
# -----------------------------------------------------------------
log "Deploying to instance"

echo "Uploading files to $INST_EIP..."
scp $SSH_OPTS /tmp/sela-deploy.tar.gz "$SSH_USER@$INST_EIP:~/"
scp $SSH_OPTS -r "$REPO_ROOT/client/dist" "$SSH_USER@$INST_EIP:~/"
scp $SSH_OPTS /tmp/sela-prod-env.yml "$SSH_USER@$INST_EIP:~/prod.env.yml"
scp $SSH_OPTS /tmp/sela-prod-secrets.yml "$SSH_USER@$INST_EIP:~/prod.secrets.yml"
scp $SSH_OPTS "$INFRA_DIR/setup-instance.sh" "$SSH_USER@$INST_EIP:~/"
scp $SSH_OPTS "$INFRA_DIR/nginx.conf" "$SSH_USER@$INST_EIP:~/"
scp $SSH_OPTS "$INFRA_DIR/sela-backend.service" "$SSH_USER@$INST_EIP:~/"

echo "Running setup..."
# shellcheck disable=SC2029
ssh $SSH_OPTS "$SSH_USER@$INST_EIP" \
    "chmod +x ~/setup-instance.sh && sudo ~/setup-instance.sh --db-password '$DB_PASSWORD'"

# -----------------------------------------------------------------
# Cleanup temp files
# -----------------------------------------------------------------
rm -f /tmp/sela-deploy.tar.gz /tmp/sela-prod-env.yml /tmp/sela-prod-secrets.yml

# =================================================================
# PHASE 3: VERIFICATION
# =================================================================

log "Verification"

echo "Waiting 30s for services to stabilize..."
sleep 30

echo ""
echo "--- Health Check ---"
if curl -sf "https://$DOMAIN/health" --max-time 10; then
    echo ""
    echo "Health check: PASSED"
else
    echo "Health check via domain not yet available (DNS propagation may take a few minutes)."
    echo "Trying via ALB DNS..."
    curl -sf "http://$ALB_DNS/health" --max-time 10 || echo "ALB health check pending."
fi

echo ""
echo "--- Target Health ---"
aws_cmd elbv2 describe-target-health --target-group-arn "$TG_ARN" \
    --query "TargetHealthDescriptions[*].{Instance:Target.Id,Health:TargetHealth.State}" \
    --output table

echo ""
echo "============================================"
echo "  Deployment complete!"
echo "  URL: https://$DOMAIN"
echo "  Instance: $INST_EIP (with DB)"
echo "============================================"
