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

## 2. Create databases

```bash
psql -U postgres -c "CREATE DATABASE client_db;"
psql -U postgres -c "CREATE DATABASE admin_db;"
```

## 3. Apply migrations

Linux/macOS:

```bash
bash scripts/db/apply_migrations.sh --client-db client_db --admin-db admin_db --db-user postgres --db-host localhost --db-port 5432
```

Windows (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/db/apply_migrations.ps1 -ClientDb client_db -AdminDb admin_db -DbUser postgres -DbHost localhost -DbPort 5432
```

Optional dev seeds:

```bash
bash scripts/db/apply_seeds.sh --seed-profile dev --client-db client_db --admin-db admin_db --db-user postgres --db-host localhost --db-port 5432
```

```powershell
powershell -ExecutionPolicy Bypass -File scripts/db/apply_seeds.ps1 -SeedProfile dev -ClientDb client_db -AdminDb admin_db -DbUser postgres -DbHost localhost -DbPort 5432
```

## 4. Environment

Create `.env` in repo root:

```env
APP_ENV=development
DB_CONNECTION_URL=postgres://postgres:yourpassword@localhost:5432/client_db
ADMIN_DB_CONNECTION_URL=postgres://postgres:yourpassword@localhost:5432/admin_db
SECRET_KEY=your-secret-key-at-least-32-characters-long
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Notes:

- `DB_CONNECTION_URL` points to applicant data.
- `ADMIN_DB_CONNECTION_URL` points to partner/staff, university, and submission data.
- `APP_ENV` must be `development` or `production`.
- In production, set `COOKIE_SECURE=true` and do not allow wildcard CORS origins.
- `ADMIN_SERVICE_URL` and `INTERNAL_SERVICE_TOKEN` are no longer used by the supported monolith flow.

## 5. Run the app

```bash
# terminal 1
go run services/backend/cmd/main.go

# terminal 2
cd frontend
npm install
npm run dev
```

## 6. Verify

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8081/v1.0`
- Frontend dev proxy: `/api`

## Supported roles

- `applicant`
- `partner`
- `staff`

Legacy role names and multi-login portal flows are no longer part of the supported setup.

## Seed accounts

- Staff: `admin@kallisto.uz` / `admin123`
- Partner: `manager@kallisto.uz` / `admin123`
- Applicant: create via `/auth/sign-up`

## Operational notes

- Password reset routes exist but return `503 Service Unavailable`.
- Authenticated unsafe requests require the readable `csrf_token` cookie and matching `X-CSRF-Token` header.
- Frontend session bootstrap now comes from `GET /v1.0/auth/session`; the old readable `session_meta` cookie is no longer part of the supported flow.
- Application verdicts are not handled in Kallisto. Applicant applications are `draft` or `submitted`; partner/staff submissions are read-only `submitted`.
- The supported frontend uses one sign-in flow and one API proxy; there is no supported `/adminapi` path.
