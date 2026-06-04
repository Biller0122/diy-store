#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.production"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.aws.yml"

cd "${ROOT_DIR}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Copy .env.production.example and fill in AWS/RDS/S3 settings first." >&2
  exit 1
fi

required_vars=(
  CUSTOMER_DOMAIN
  ADMIN_DOMAIN
  DRIVER_DOMAIN
  MERCHANT_DOMAIN
  ACME_EMAIL
  DB_HOST
  DB_PASSWORD
  S3_BUCKET
  REALTIME_WEBHOOK_SECRET
  COOKIE_SECRET
  SUPERADMIN_PASSWORD
)

missing=()
for var_name in "${required_vars[@]}"; do
  if ! grep -Eq "^${var_name}=.+" "${ENV_FILE}"; then
    missing+=("${var_name}")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo "Missing required values in .env.production: ${missing[*]}" >&2
  exit 1
fi

bash deploy/aws/bootstrap-swap.sh

export DOCKER_BUILDKIT=1
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" build
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps
