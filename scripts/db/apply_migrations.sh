#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

DATABASE="admin_db"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
PSQL_PATH=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --database|--admin-db) DATABASE="$2"; shift 2 ;;
    --db-user) DB_USER="$2"; shift 2 ;;
    --db-host) DB_HOST="$2"; shift 2 ;;
    --db-port) DB_PORT="$2"; shift 2 ;;
    --psql-path) PSQL_PATH="$2"; shift 2 ;;
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

MIGRATION_FILES=(
  "admin_db.sql"
  "20260329_current_state_contracts.sql"
  "20260329_drop_legacy_single_db_scaffolding.sql"
)

for migration_file in "${MIGRATION_FILES[@]}"; do
  run_migration "$DATABASE" "$migration_file"
done

echo "Migration apply complete."
