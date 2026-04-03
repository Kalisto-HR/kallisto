# Database Migrations and Seeds

This document describes the supported database bootstrap and rollout path for the current monolith runtime.

## Current-state bootstrap

The supported deployment entrypoint is:

- `scripts/migrations/deploy_admin_db.sql`

The supported runtime uses one PostgreSQL database: `admin_db`.

## Migration order

`deploy_admin_db.sql` is the deployment-facing artifact. It composes the canonical schema, current-state contract upgrades, legacy cleanup, and the defensive compare-orphan cleanup in one idempotent script.

The split SQL files remain in the repository as local composition inputs for developers and for auditability:

- `scripts/migrations/admin_db.sql`
- `scripts/migrations/20260329_current_state_contracts.sql`
- `scripts/migrations/20260329_drop_legacy_single_db_scaffolding.sql`

`scripts/db/apply_migrations.*` remains local tooling only and should not be treated as the production deployment contract.

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
psql -U postgres -d admin_db -f scripts/migrations/deploy_admin_db.sql
```

### Windows (PowerShell)

```powershell
$env:PSQL_PATH='C:\Program Files\PostgreSQL\18\bin\psql.exe'
& $env:PSQL_PATH -U postgres -d admin_db -f scripts/migrations/deploy_admin_db.sql
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

Existing environments that were bootstrapped before the current-state cleanup should still run the same deployment entrypoint. The forward migration files included by `deploy_admin_db.sql` will:

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
