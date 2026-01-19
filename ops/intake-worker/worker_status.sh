#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${1:-stai-intake-worker}"
ENV_FILE="${ENV_FILE:-/etc/stai/intake-worker.env}"

if command -v systemctl >/dev/null 2>&1; then
  echo "service_name=${SERVICE_NAME}"
  systemctl is-active --quiet "${SERVICE_NAME}" && echo "service_status=active" || echo "service_status=inactive"
  systemctl show -p ActiveState -p SubState -p ExecMainPID "${SERVICE_NAME}" --no-pager || true
fi

if [ -f "${ENV_FILE}" ]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

if command -v psql >/dev/null 2>&1 && [ -n "${DATABASE_URL:-}" ]; then
  echo "latest_metrics="
  psql "${DATABASE_URL}" -Atc \
    "select worker_id, processed_count, success_count, duplicate_count, failure_count, avg_processing_ms, last_success_at, last_error_at, updated_at from app.ingest_worker_metrics order by updated_at desc limit 1;"
else
  echo "metrics_unavailable=missing_psql_or_DATABASE_URL"
fi
