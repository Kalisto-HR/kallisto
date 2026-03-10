# Kallisto Setup

## Prerequisites

- Go 1.24+
- Node.js 18+
- PostgreSQL 12+
- `psql` available in PATH (or set explicit path)

## 1) Clone

```bash
git clone <repository-url>
cd kallisto
```

## 2) Database bootstrap

Create databases:

```bash
psql -U postgres -c "CREATE DATABASE client_db;"
psql -U postgres -c "CREATE DATABASE admin_db;"
```

### Linux/macOS

Apply migrations:

```bash
bash scripts/db/apply_migrations.sh --client-db client_db --admin-db admin_db --db-user postgres --db-host localhost --db-port 5432
```

Apply seeds (dev profile):

```bash
bash scripts/db/apply_seeds.sh --seed-profile dev --client-db client_db --admin-db admin_db --db-user postgres --db-host localhost --db-port 5432
```

Optional one-command bootstrap:

```bash
bash scripts/db/bootstrap.sh --create-databases --seed-profile dev --db-user postgres --db-host localhost --db-port 5432
```

### Windows (PowerShell)

Apply migrations:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/db/apply_migrations.ps1 -ClientDb client_db -AdminDb admin_db -DbUser postgres -DbHost localhost -DbPort 5432
```

Apply seeds (dev profile):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/db/apply_seeds.ps1 -SeedProfile dev -ClientDb client_db -AdminDb admin_db -DbUser postgres -DbHost localhost -DbPort 5432
```

Optional one-command bootstrap:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/db/bootstrap.ps1 -CreateDatabases -SeedProfile dev -DbUser postgres -DbHost localhost -DbPort 5432
```

If password prompts are frequent:

```powershell
$env:PGPASSWORD="your_postgres_password"
$env:PSQL_PATH="C:\Program Files\PostgreSQL\18\bin\psql.exe"
```

## 3) Environment

Create `.env` in repo root:

```env
DB_CONNECTION_URL=postgres://postgres:yourpassword@localhost:5432/client_db
ADMIN_DB_CONNECTION_URL=postgres://postgres:yourpassword@localhost:5432/admin_db
SECRET_KEY=your-secret-key-at-least-32-characters-long
ADMIN_SERVICE_URL=http://localhost:8082
CLIENT_PASSWORD_RESET_URL=http://localhost:5173/auth/reset-password?portal=student
ADMIN_PASSWORD_RESET_URL=http://localhost:5173/auth/reset-password?portal=management
```

## 4) Run services

```bash
# Terminal 1
go run services/client/cmd/main.go

# Terminal 2
go run services/admin/cmd/main/main.go

# Terminal 3
cd frontend
npm install
npm run dev
```

## 5) Verify

- Frontend: `http://localhost:5173`
- Client API health path check via any endpoint on `http://localhost:8081/v1.0`
- Admin API health path check via any endpoint on `http://localhost:8082/v1.0`

## Seed Accounts

- `admin@kallisto.uz` / `admin123`
- `manager@kallisto.uz` / `admin123`
- `kbtu.manager@kallisto.uz` / `admin123`

## Common Commands

| Task | Command |
|---|---|
| Build client | `go build -o bin/client services/client/cmd/main.go` |
| Build admin | `go build -o bin/admin services/admin/cmd/main/main.go` |
| Build frontend | `cd frontend && npm run build` |
| Lint frontend | `cd frontend && npm run lint` |
| Apply migrations (sh) | `bash scripts/db/apply_migrations.sh --client-db client_db --admin-db admin_db --db-user postgres --db-host localhost --db-port 5432` |
| Apply seeds (sh) | `bash scripts/db/apply_seeds.sh --seed-profile dev --client-db client_db --admin-db admin_db --db-user postgres --db-host localhost --db-port 5432` |
| Apply migrations (ps1) | `powershell -ExecutionPolicy Bypass -File scripts/db/apply_migrations.ps1 -ClientDb client_db -AdminDb admin_db -DbUser postgres -DbHost localhost -DbPort 5432` |
| Apply seeds (ps1) | `powershell -ExecutionPolicy Bypass -File scripts/db/apply_seeds.ps1 -SeedProfile dev -ClientDb client_db -AdminDb admin_db -DbUser postgres -DbHost localhost -DbPort 5432` |

## Troubleshooting

### `psql is not available in PATH`

- Add PostgreSQL `bin` directory to PATH.
- Or set `PSQL_PATH` and rerun scripts.

### `relation already exists` on migration

- You are applying on a non-empty schema.
- Use the canonical migration scripts in `scripts/db/` and rerun.

### `syntax error at or near BOM bytes`

- Regenerate seed SQL with the latest seed importer scripts (UTF-8 without BOM).

### Unauthorized during app use

- Access token TTL is 15 minutes.
- Sign in again if cookie expired.

