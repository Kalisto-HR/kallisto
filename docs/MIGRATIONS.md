# Database Migrations and Seeds

This file is the source of truth for DB bootstrap and schema rollout.

## Canonical migration files

Use only:

- `scripts/migrations/client_db.sql`
- `scripts/migrations/admin_db.sql`

Versioned migration fragments were consolidated into these canonical files.

## Current schema invariants

The supported runtime assumes these current invariants from the canonical files:

- `client_db.users.role` is fixed to `applicant`
- `admin_db.users.role` is limited to `partner|staff`
- `client_db.applications.status` is limited to `draft|submitted`
- `admin_db.submitted_applications.status` is limited to `submitted`
- `submitted_applications.reviewed_by`, `reviewed_at`, and `notes` are no longer part of the supported schema
- `university_staff_profiles`, `university_staff_invitations`, and `university_staff_status_events` are dropped from the supported schema
- university application read payloads are expected to normalize to `application_schema.sections[*].fields[*]`

## Apply migrations

### Linux/macOS

```bash
bash scripts/db/apply_migrations.sh --client-db client_db --admin-db admin_db --db-user postgres --db-host localhost --db-port 5432
```

### Windows (PowerShell)

```powershell
powershell -ExecutionPolicy Bypass -File scripts/db/apply_migrations.ps1 -ClientDb client_db -AdminDb admin_db -DbUser postgres -DbHost localhost -DbPort 5432
```

## Apply seeds

### Linux/macOS

```bash
bash scripts/db/apply_seeds.sh --seed-profile dev --client-db client_db --admin-db admin_db --db-user postgres --db-host localhost --db-port 5432
```

### Windows (PowerShell)

```powershell
powershell -ExecutionPolicy Bypass -File scripts/db/apply_seeds.ps1 -SeedProfile dev -ClientDb client_db -AdminDb admin_db -DbUser postgres -DbHost localhost -DbPort 5432
```

## Full bootstrap

### Linux/macOS

```bash
bash scripts/db/bootstrap.sh --create-databases --seed-profile dev --db-user postgres --db-host localhost --db-port 5432
```

### Windows (PowerShell)

```powershell
powershell -ExecutionPolicy Bypass -File scripts/db/bootstrap.ps1 -CreateDatabases -SeedProfile dev -DbUser postgres -DbHost localhost -DbPort 5432
```

## Seed profiles

- `dev`: demo data for local development
- `staging`: minimal deterministic baseline
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

## Troubleshooting

### `psql is not available in PATH`

Set `PSQL_PATH` or pass `-PsqlPath`/`--psql-path`.

### `relation ... already exists`

Re-run using canonical migration scripts under `scripts/db/`.

### Seed BOM issues (`BOM bytes`)

Use the current seed importers in `scripts/seeds/` (UTF-8 without BOM).

