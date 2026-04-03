# Kallisto Setup

## Prerequisites

- Go 1.24+
- Node.js 18+
- PostgreSQL 12+

## 1. Clone

```bash
git clone <repository-url>
cd kallisto
```

## 2. Create database

```bash
psql -U postgres -c "CREATE DATABASE admin_db;"
```

## 3. Apply migrations

Linux/macOS:

```bash
psql -U postgres -d admin_db -f scripts/migrations/deploy_admin_db.sql
```

Windows (PowerShell):

```powershell
$env:PSQL_PATH='C:\Program Files\PostgreSQL\18\bin\psql.exe'
& $env:PSQL_PATH -U postgres -d admin_db -f scripts/migrations/deploy_admin_db.sql
```

The deployment entrypoint is `scripts/migrations/deploy_admin_db.sql`. The wrapper scripts under `scripts/db/` remain local tooling only.

## 4. Optional seeds

```bash
bash scripts/db/apply_seeds.sh --seed-profile dev --database admin_db --db-user postgres --db-host localhost --db-port 5432
```

```powershell
powershell -ExecutionPolicy Bypass -File scripts/db/apply_seeds.ps1 -SeedProfile dev -Database admin_db -DbUser postgres -DbHost localhost -DbPort 5432
```

## 5. Environment

Create `.env` in repo root:

```env
APP_ENV=development
DATABASE_URL=postgres://postgres:yourpassword@localhost:5432/admin_db
SECRET_KEY=your-secret-key-at-least-32-characters-long
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Notes:

- `DATABASE_URL` is the only supported runtime connection string
- `APP_ENV` must be `development` or `production`
- in production, set `COOKIE_SECURE=true` and restrict CORS origins explicitly

## 6. Run the app

```bash
# terminal 1
go run services/backend/cmd/main.go

# terminal 2
cd frontend
npm install
npm run dev
```

## 7. Verify

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8081/v1.0`
- Frontend dev proxy: `/api`

## Supported roles

- `applicant`
- `partner`
- `staff`

## Seed accounts

- Staff: `admin@kallisto.uz` / `admin123`
- Partner: `manager@kallisto.uz` / `admin123`
- Applicant: create via `/auth/sign-up`

## Operational notes

- password reset routes exist but return `503 Service Unavailable`
- authenticated unsafe requests require the readable `csrf_token` cookie and matching `X-CSRF-Token` header
- frontend session bootstrap comes from `GET /v1.0/auth/session`
- application verdicts are not handled in Kallisto
- the supported frontend uses one sign-in flow and one API proxy
