#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

DATABASE="admin_db"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
PSQL_PATH=""
SEED_PROFILE="dev"
CREATE_DATABASES="false"
SKIP_SEEDS="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --database|--admin-db) DATABASE="$2"; shift 2 ;;
    --db-user) DB_USER="$2"; shift 2 ;;
    --db-host) DB_HOST="$2"; shift 2 ;;
    --db-port) DB_PORT="$2"; shift 2 ;;
    --psql-path) PSQL_PATH="$2"; shift 2 ;;
    --seed-profile) SEED_PROFILE="$2"; shift 2 ;;
    --create-databases) CREATE_DATABASES="true"; shift ;;
    --skip-seeds) SKIP_SEEDS="true"; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

PSQL_BIN="$(resolve_psql "$PSQL_PATH")"

ensure_db_exists() {
  local db="$1"
  local exists
  exists=$("$PSQL_BIN" -t -A -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '$db';")
  exists="${exists//$'\n'/}"
  if [[ "$exists" == "1" ]]; then
    echo "Database already exists: $db"
    return
  fi

  echo "Creating database: $db"
  "$PSQL_BIN" -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$db\";"
}

if [[ "$CREATE_DATABASES" == "true" ]]; then
  ensure_db_exists "$DATABASE"
fi

"$SCRIPT_DIR/apply_migrations.sh" \
  --database "$DATABASE" \
  --db-user "$DB_USER" \
  --db-host "$DB_HOST" \
  --db-port "$DB_PORT" \
  --psql-path "$PSQL_BIN"

if [[ "$SKIP_SEEDS" != "true" ]]; then
  "$SCRIPT_DIR/apply_seeds.sh" \
    --seed-profile "$SEED_PROFILE" \
    --database "$DATABASE" \
    --db-user "$DB_USER" \
    --db-host "$DB_HOST" \
    --db-port "$DB_PORT" \
    --psql-path "$PSQL_BIN"
fi

echo "Bootstrap complete."
