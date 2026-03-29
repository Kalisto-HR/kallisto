# Database Migrations and Seeds

This document describes the supported database bootstrap and rollout path for the current monolith runtime.

## Current-state bootstrap

Use these files for supported environments:

- `scripts/migrations/admin_db.sql`
- `scripts/migrations/20260329_current_state_contracts.sql`
- `scripts/migrations/20260329_drop_legacy_single_db_scaffolding.sql`

The supported runtime uses one PostgreSQL database: `admin_db`.

## Migration order

`scripts/db/apply_migrations.*` applies the migration set in this order:

1. `admin_db.sql`
2. `20260329_current_state_contracts.sql`
3. `20260329_drop_legacy_single_db_scaffolding.sql`

That order is intentional:

- `admin_db.sql` defines the current canonical schema for fresh environments
- `20260329_current_state_contracts.sql` upgrades existing environments to the current contracts
- `20260329_drop_legacy_single_db_scaffolding.sql` removes retired legacy tables and compatibility artifacts after the contract rewrite is in place

All three files are written to be idempotent for repeatable local bootstrap.

## Current schema invariants

The supported runtime assumes these invariants after migrations complete:

- `users.role` is limited to `applicant|partner|staff`
- `applications.status` is limited to `draft|submitted`
- partner and staff read submissions from unified `applications` and `application_files`
- `universities.university_profile` is the canonical profile JSON column
- application-structure visibility keys use `applicant|partner|staff`
- `admin_db` contains applicant, partner, staff, university, application, auth-session, and observability data

Retired tables `submitted_applications` and `submitted_application_files` are not part of the supported schema.

## Apply migrations

### Linux/macOS

```bash
bash scripts/db/apply_migrations.sh --database admin_db --db-user postgres --db-host localhost --db-port 5432
```

### Windows (PowerShell)

```powershell
powershell -ExecutionPolicy Bypass -File scripts/db/apply_migrations.ps1 -Database admin_db -DbUser postgres -DbHost localhost -DbPort 5432
```

## Apply seeds

### Linux/macOS

```bash
bash scripts/db/apply_seeds.sh --seed-profile dev --database admin_db --db-user postgres --db-host localhost --db-port 5432
```

### Windows (PowerShell)

```powershell
powershell -ExecutionPolicy Bypass -File scripts/db/apply_seeds.ps1 -SeedProfile dev -Database admin_db -DbUser postgres -DbHost localhost -DbPort 5432
```

## Full bootstrap

### Linux/macOS

```bash
bash scripts/db/bootstrap.sh --create-databases --seed-profile dev --database admin_db --db-user postgres --db-host localhost --db-port 5432
```

### Windows (PowerShell)

```powershell
powershell -ExecutionPolicy Bypass -File scripts/db/bootstrap.ps1 -CreateDatabases -SeedProfile dev -Database admin_db -DbUser postgres -DbHost localhost -DbPort 5432
```

## Seed profiles

- `dev`: demo baseline for local development
- `staging`: minimal deterministic bootstrap
- `none`: skip seeding

## Optional environment helpers

Linux/macOS:

```bash
export PGPASSWORD='your_postgres_password'
export PSQL_PATH='/usr/bin/psql'
```

Windows:

```powershell
$env:PGPASSWORD='your_postgres_password'
$env:PSQL_PATH='C:\Program Files\PostgreSQL\18\bin\psql.exe'
```

## Forward-only cleanup for deployed environments

Existing environments that were bootstrapped before the current-state cleanup should still run the same migration entrypoint. The forward migration files will:

- rename `universities.management_profile` to `universities.university_profile`
- rewrite application-structure visibility keys from `reviewer|admin` to `partner|staff`
- drop retired tables such as `submitted_applications` and `submitted_application_files`

No historical audit rows are rewritten. Existing `audit_logs.actor_type` normalization remains intact, and only active contracts are renamed.

## Troubleshooting

### `psql is not available in PATH`

Set `PSQL_PATH` or pass `-PsqlPath` / `--psql-path`.

### `relation ... already exists`

Re-run the canonical migration entrypoint under `scripts/db/`. The migration set is designed to be re-applied safely.

### Seed BOM issues

Use the current seed importers and SQL files under `scripts/seeds/` only.
