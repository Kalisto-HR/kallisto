# Database Migrations and Seeds

This document is the source of truth for database migration and seed execution order.

## Migration Order

Apply in this exact order.

### `client_db`
1. `scripts/migrations/client_db.sql`
2. `scripts/migrations/client_db_v2_university_compare.sql`
3. `scripts/migrations/client_db_v2_application_transcripts.sql`
4. `scripts/migrations/client_db_v3_application_files.sql`
5. `scripts/migrations/client_db_v4_profile_test_scores.sql`
6. `scripts/migrations/client_db_v5_application_test_scores.sql`

### `admin_db`
1. `scripts/migrations/admin_db.sql`
2. `scripts/migrations/admin_db_v2_university_fields.sql`
3. `scripts/migrations/admin_db_v3_superuser_global.sql`
4. `scripts/migrations/admin_db_v4_manager_portal.sql`
5. `scripts/migrations/admin_db_v5_partner_link_backfill.sql`
6. `scripts/migrations/admin_db_v6_submitted_application_files.sql`

## Standard Scripts

### Apply migrations
```powershell
.\scripts\db\apply_migrations.ps1 -ClientDb client_db -AdminDb admin_db -DbUser postgres -DbHost localhost -DbPort 5432
```
If `psql` is not in PATH, add:
```powershell
-PsqlPath "C:\Program Files\PostgreSQL\17\bin\psql.exe"
```
or set once per session:
```powershell
$env:PSQL_PATH="C:\Program Files\PostgreSQL\17\bin\psql.exe"
```
Set password once per terminal session:
```powershell
$env:PGPASSWORD="your_postgres_password"
```

### Apply seeds
```powershell
.\scripts\db\apply_seeds.ps1 -SeedProfile dev -ClientDb client_db -AdminDb admin_db -DbUser postgres -DbHost localhost -DbPort 5432
```
The same `-PsqlPath` / `PSQL_PATH` options are supported here as well.

Seed profiles:
- `dev`: universities + full demo admin/manager/superuser seed dataset.
- `staging`: universities + minimal deterministic admin bootstrap seed.
- `none`: no seed actions.

### Full bootstrap (create dbs + migrations + seeds)
```powershell
.\scripts\db\bootstrap.ps1 -CreateDatabases -SeedProfile dev -DbUser postgres -DbHost localhost -DbPort 5432
```

### Migration smoke test (CI-safe local check)
```powershell
.\scripts\db\smoke_test_migrations.ps1 -DbUser postgres -DbHost localhost -DbPort 5432
```

This command creates temporary databases, applies all migrations twice (idempotency check), runs verification queries, then drops temporary databases.

## Seed Files

- Development: `scripts/seeds/admin_seed.sql`
- Staging: `scripts/seeds/admin_seed_staging.sql`
- University dataset: `scripts/seeds/data/universities.v1.json`

All seed files are idempotent and can be re-run safely.

## Troubleshooting

### `relation "users" already exists` during `admin_db.sql`
- Cause: older non-idempotent base schema in a previously checked-out version.
- Fix: pull latest migrations and re-run `apply_migrations.ps1` (base admin migration is now idempotent).

### `invalid reference to FROM-clause entry for table "u"` in `admin_db_v5_partner_link_backfill.sql`
- Cause: older migration version with invalid alias reference.
- Fix: pull latest migrations and re-run `apply_migrations.ps1`.

### `syntax error at or near "ï»¿"` while seeding universities
- Cause: BOM at beginning of generated SQL temp file.
- Fix: pull latest `scripts/seeds/import_universities.ps1` (now writes UTF-8 without BOM), then re-run `apply_seeds.ps1`.
