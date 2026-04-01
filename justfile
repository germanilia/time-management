# Environment: set APP_ENV=dev (default), APP_ENV=prod, etc.
export APP_ENV := env("APP_ENV", "dev")

# Development
setup:
    cd backend && uv sync
    cd client && npm install

run-backend:
    cd backend && uv run uvicorn app.main:app --reload --port 8000

run-client:
    cd client && npm run dev

run:
    just run-backend & just run-client

# Database
db-up:
    docker compose up -d postgres

db-down:
    docker compose down

db-reset:
    docker compose down -v
    docker compose up -d postgres
    sleep 3
    just migrate

migrate:
    cd backend && uv run alembic upgrade head

generate-migration name:
    cd backend && uv run alembic revision --autogenerate -m "{{name}}"

# Testing
test-backend *args:
    cd backend && uv run pytest {{args}}

test-backend-file file:
    cd backend && uv run pytest "{{file}}" -v

test-backend-grep pattern:
    cd backend && uv run pytest -k "{{pattern}}" -v

test-frontend *args:
    cd client && npm run test {{args}}

test-e2e *args:
    cd client && npx playwright test {{args}}

test-e2e-file file:
    cd client && npx playwright test "{{file}}"

test-e2e-grep pattern:
    cd client && npx playwright test -g "{{pattern}}"

# Deployment
deploy:
    bash infra/deploy.sh

# Code quality
lint:
    cd backend && uv run ruff check .
    cd client && npm run lint

format:
    cd backend && uv run ruff format .
    cd client && npm run format

typecheck:
    cd backend && uv run pyright
    cd client && npm run typecheck
