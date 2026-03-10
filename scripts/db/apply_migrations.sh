#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

CLIENT_DB="client_db"
ADMIN_DB="admin_db"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
PSQL_PATH=""
SKIP_CLIENT="false"
SKIP_ADMIN="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --client-db) CLIENT_DB="$2"; shift 2 ;;
    --admin-db) ADMIN_DB="$2"; shift 2 ;;
    --db-user) DB_USER="$2"; shift 2 ;;
    --db-host) DB_HOST="$2"; shift 2 ;;
    --db-port) DB_PORT="$2"; shift 2 ;;
    --psql-path) PSQL_PATH="$2"; shift 2 ;;
    --skip-client) SKIP_CLIENT="true"; shift ;;
    --skip-admin) SKIP_ADMIN="true"; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

PSQL_BIN="$(resolve_psql "$PSQL_PATH")"
MIGRATIONS_DIR="$SCRIPT_DIR/../migrations"

run_migration() {
  local db="$1"
  local file="$2"
  local path="$MIGRATIONS_DIR/$file"
  if [[ ! -f "$path" ]]; then
    echo "Migration file not found: $path" >&2
    exit 1
  fi
  echo "Applying migration to $db: $file"
  "$PSQL_BIN" -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db" -f "$path"
}

if [[ "$SKIP_CLIENT" == "false" ]]; then
  run_migration "$CLIENT_DB" "client_db.sql"
fi

if [[ "$SKIP_ADMIN" == "false" ]]; then
  run_migration "$ADMIN_DB" "admin_db.sql"
fi

echo "Migration apply complete."
