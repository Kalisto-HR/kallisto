# Kallisto

Kallisto is a monorepo for a university application platform with a React SPA frontend and a Go monolith backend backed by one PostgreSQL database.

## Current architecture

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8081/v1.0`
- Database:
  - `admin_db` as the single runtime store for applicant, partner, staff, university, application, auth-session, and observability data

## Roles

Only these roles are supported:

- `applicant`
- `partner`
- `staff`

## Quick start

### 1. Create database

```bash
psql -U postgres -c "CREATE DATABASE admin_db;"
```

### 2. Apply migrations

Linux/macOS:

```bash
bash scripts/db/apply_migrations.sh --database admin_db --db-user postgres --db-host localhost --db-port 5432
```

Windows (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/db/apply_migrations.ps1 -Database admin_db -DbUser postgres -DbHost localhost -DbPort 5432
```

### 3. Configure `.env`

```env
APP_ENV=development
DATABASE_URL=postgres://postgres:yourpassword@localhost:5432/admin_db
SECRET_KEY=your-secret-key-at-least-32-characters-long
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### 4. Run the backend and frontend

```bash
# terminal 1
go run services/backend/cmd/main.go

# terminal 2
cd frontend
npm install
npm run dev
```

## Seed accounts

- Staff: `admin@kallisto.uz` / `admin123`
- Partner: `manager@kallisto.uz` / `admin123`
- Applicant: use the unified sign-up flow

## Product notes

- password reset is intentionally disabled until a real delivery path exists
- auth is server-session backed; the SPA bootstraps identity from `GET /v1.0/auth/session`
- authenticated unsafe requests require the readable `csrf_token` cookie plus `X-CSRF-Token`
- the supported runtime uses `DATABASE_URL` only
- Kallisto does not release application verdicts
- the frontend talks to the backend through one `/api` proxy during development
- all role-scoped route groups emit `service_logs` rows and return `X-Request-Id`
- audit logging remains focused on auth, security, and partner or staff administrative events
- canonical frontend routes are:
  - `/applicant/*`
  - `/partner/:universityId/*`
  - `/staff/*`

## Verification and quality gates

Before shipping changes, run:

```bash
go test ./...
cd frontend && npm run test -- --run
cd frontend && npm run test:coverage
cd frontend && npm run lint
cd frontend && npm run build
```

## Documentation

- [Setup](C:/Users/Vida/Documents/Kallisto/kallisto/docs/SETUP.md)
- [Architecture](C:/Users/Vida/Documents/Kallisto/kallisto/docs/ARCHITECTURE.md)
- [API](C:/Users/Vida/Documents/Kallisto/kallisto/docs/API.md)
- [Migrations](C:/Users/Vida/Documents/Kallisto/kallisto/docs/MIGRATIONS.md)
- [Observability](C:/Users/Vida/Documents/Kallisto/kallisto/docs/OBSERVABILITY.md)
- [System Map](C:/Users/Vida/Documents/Kallisto/kallisto/docs/SYSTEM_MAP.md)
- [Handover](C:/Users/Vida/Documents/Kallisto/kallisto/docs/HANDOVER.md)
- Historical reference: `docs/archive/`
