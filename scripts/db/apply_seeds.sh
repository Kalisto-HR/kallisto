#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

SEED_PROFILE="dev"
CLIENT_DB="client_db"
ADMIN_DB="admin_db"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
PSQL_PATH=""
SKIP_UNIVERSITIES="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --seed-profile) SEED_PROFILE="$2"; shift 2 ;;
    --client-db) CLIENT_DB="$2"; shift 2 ;;
    --admin-db) ADMIN_DB="$2"; shift 2 ;;
    --db-user) DB_USER="$2"; shift 2 ;;
    --db-host) DB_HOST="$2"; shift 2 ;;
    --db-port) DB_PORT="$2"; shift 2 ;;
    --psql-path) PSQL_PATH="$2"; shift 2 ;;
    --skip-universities) SKIP_UNIVERSITIES="true"; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ "$SEED_PROFILE" == "none" ]]; then
  echo "Seed profile 'none' selected."
  exit 0
fi

PSQL_BIN="$(resolve_psql "$PSQL_PATH")"
SEEDS_DIR="$SCRIPT_DIR/../seeds"

if [[ "$SKIP_UNIVERSITIES" == "false" ]]; then
  go run "$SEEDS_DIR/cmd/import_universities/main.go"
fi

apply_seed() {
  local db="$1"
  local file="$2"
  local path="$SEEDS_DIR/$file"
  if [[ ! -f "$path" ]]; then
    echo "Seed file not found: $path" >&2
    exit 1
  fi
  echo "Applying seed to $db: $file"
  "$PSQL_BIN" -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db" -f "$path"
}

if [[ "$SEED_PROFILE" == "dev" ]]; then
  apply_seed "$ADMIN_DB" "admin_seed.sql"
elif [[ "$SEED_PROFILE" == "staging" ]]; then
  apply_seed "$ADMIN_DB" "admin_seed_staging.sql"
else
  echo "Unsupported seed profile: $SEED_PROFILE" >&2
  exit 1
fi

echo "Seed apply complete."
