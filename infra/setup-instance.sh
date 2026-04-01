#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------
# setup-instance.sh — runs on the EC2 instance via SSH (as root)
# Usage: sudo ./setup-instance.sh --db-password <pw>
# -----------------------------------------------------------------

DB_PASSWORD=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --db-password) DB_PASSWORD="$2"; shift 2 ;;
        *) echo "Unknown arg: $1"; exit 1 ;;
    esac
done

if [[ -z "$DB_PASSWORD" ]]; then
    echo "Usage: $0 --db-password <pw>"
    exit 1
fi

APP_DIR=/opt/sela-time-mgmt
DIST_DIR=/var/www/sela-time-mgmt
HOME_DIR=/home/ec2-user

echo "=== Setting up instance ==="

# ---------------------------------------------------------------
# 1. System packages
# ---------------------------------------------------------------
echo "--- Installing system packages ---"
dnf update -y -q
dnf install -y -q docker nginx python3.12 tar gzip gcc python3.12-devel libpq-devel

systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

# ---------------------------------------------------------------
# 2. Install uv (Python package manager)
# ---------------------------------------------------------------
echo "--- Installing uv ---"
if ! command -v /home/ec2-user/.local/bin/uv &>/dev/null; then
    sudo -u ec2-user bash -c 'curl -LsSf https://astral.sh/uv/install.sh | sh'
fi

# ---------------------------------------------------------------
# 3. PostgreSQL
# ---------------------------------------------------------------
echo "--- Starting PostgreSQL (pgvector/pgvector:pg17) ---"
docker pull pgvector/pgvector:pg17
docker stop sela-postgres 2>/dev/null || true
docker rm sela-postgres 2>/dev/null || true
docker run -d \
    --name sela-postgres \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD="$DB_PASSWORD" \
    -p 5432:5432 \
    -v pgdata:/var/lib/postgresql/data \
    --restart unless-stopped \
    pgvector/pgvector:pg17

echo "--- Waiting for PostgreSQL to be ready ---"
for i in $(seq 1 30); do
    if docker exec sela-postgres pg_isready -U postgres &>/dev/null; then
        echo "PostgreSQL ready."
        break
    fi
    if [[ $i -eq 30 ]]; then
        echo "ERROR: PostgreSQL did not become ready in time."
        exit 1
    fi
    sleep 2
done

# ---------------------------------------------------------------
# 4. Extract application
# ---------------------------------------------------------------
echo "--- Deploying application ---"
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR"
tar xzf "$HOME_DIR/sela-deploy.tar.gz" -C "$APP_DIR"

# ---------------------------------------------------------------
# 5. Install production config
# ---------------------------------------------------------------
echo "--- Installing config ---"
cp "$HOME_DIR/prod.env.yml" "$APP_DIR/config/prod.env.yml"
cp "$HOME_DIR/prod.secrets.yml" "$APP_DIR/config/prod.secrets.yml"

# ---------------------------------------------------------------
# 6. Install Python dependencies
# ---------------------------------------------------------------
echo "--- Installing Python dependencies ---"

# Fix ownership first so ec2-user can create .venv
chown -R ec2-user:ec2-user "$APP_DIR"

cd "$APP_DIR/backend"
sudo -u ec2-user bash -c "cd $APP_DIR/backend && /home/ec2-user/.local/bin/uv sync --no-dev"

# ---------------------------------------------------------------
# 7. Deploy frontend static files
# ---------------------------------------------------------------
echo "--- Deploying frontend ---"
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"
cp -r "$HOME_DIR/dist/"* "$DIST_DIR/"

# ---------------------------------------------------------------
# 8. Configure nginx
# ---------------------------------------------------------------
echo "--- Configuring nginx ---"
cp "$HOME_DIR/nginx.conf" /etc/nginx/conf.d/sela-time-mgmt.conf
rm -f /etc/nginx/conf.d/default.conf

# Replace the main nginx.conf with a minimal one that just includes conf.d
cat > /etc/nginx/nginx.conf <<'NGINXEOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    include /etc/nginx/conf.d/*.conf;
}
NGINXEOF

nginx -t
systemctl enable nginx
systemctl restart nginx

# ---------------------------------------------------------------
# 9. Install and start backend systemd service
# ---------------------------------------------------------------
echo "--- Starting backend service ---"
cp "$HOME_DIR/sela-backend.service" /etc/systemd/system/sela-backend.service
systemctl daemon-reload
systemctl enable sela-backend
systemctl restart sela-backend

# ---------------------------------------------------------------
# 10. Verify
# ---------------------------------------------------------------
echo "--- Verifying services ---"
sleep 3

if systemctl is-active --quiet nginx; then
    echo "nginx: running"
else
    echo "ERROR: nginx is not running"
    systemctl status nginx --no-pager
    exit 1
fi

if systemctl is-active --quiet sela-backend; then
    echo "sela-backend: running"
else
    echo "WARNING: sela-backend may still be starting (migrations run on first boot)"
    systemctl status sela-backend --no-pager || true
fi

echo "=== Instance setup complete ==="
