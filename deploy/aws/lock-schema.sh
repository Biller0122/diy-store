#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.production"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.aws.yml"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

if grep -q '^DB_SYNCHRONIZE=true' "${ENV_FILE}"; then
  sed -i.bak 's/^DB_SYNCHRONIZE=true/DB_SYNCHRONIZE=false/' "${ENV_FILE}"
  echo "Set DB_SYNCHRONIZE=false and saved backup at ${ENV_FILE}.bak"
else
  echo "DB_SYNCHRONIZE is already not true"
fi

cd "${ROOT_DIR}"
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d server
