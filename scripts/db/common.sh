#!/usr/bin/env bash
set -euo pipefail

resolve_psql() {
  local provided="${1:-}"
  if [[ -n "$provided" ]]; then
    if [[ -x "$provided" || -f "$provided" ]]; then
      echo "$provided"
      return 0
    fi
    echo "Provided --psql-path does not exist: $provided" >&2
    return 1
  fi

  if [[ -n "${PSQL_PATH:-}" ]]; then
    if [[ -x "$PSQL_PATH" || -f "$PSQL_PATH" ]]; then
      echo "$PSQL_PATH"
      return 0
    fi
  fi

  if command -v psql >/dev/null 2>&1; then
    command -v psql
    return 0
  fi

  echo "psql is not available in PATH. Set PSQL_PATH or pass --psql-path." >&2
  return 1
}
