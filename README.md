# Kallisto

Kallisto is a monorepo for a university application platform with a React SPA frontend and a temporary two-database Go monolith backend.

## Current architecture

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8081/v1.0`
- Databases:
  - `client_db` for applicant accounts and draft/submitted applications
  - `admin_db` for partner/staff accounts, university source-of-truth data, submissions, drafts, logs, and settings

## Roles

Only these roles are supported:

- `applicant`: application dashboard, university discovery, favorites/compare/basket, self profile/settings
- `partner`: linked-university dashboard, profile editing, application structure management, read-only submissions
- `staff`: platform dashboard, universities, service logs, audit logs, settings, partner/staff provisioning

Legacy role names such as `student`, `superuser`, `university manager`, and university-side subroles are no longer part of the supported surface.

## Quick start

### 1. Create databases

```bash
psql -U postgres -c "CREATE DATABASE client_db;"
psql -U postgres -c "CREATE DATABASE admin_db;"
```

### 2. Apply migrations

Linux/macOS:

```bash
bash scripts/db/apply_migrations.sh --client-db client_db --admin-db admin_db --db-user postgres --db-host localhost --db-port 5432
```

Windows (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/db/apply_migrations.ps1 -ClientDb client_db -AdminDb admin_db -DbUser postgres -DbHost localhost -DbPort 5432
```

### 3. Configure `.env`

```env
APP_ENV=development
DB_CONNECTION_URL=postgres://postgres:yourpassword@localhost:5432/client_db
ADMIN_DB_CONNECTION_URL=postgres://postgres:yourpassword@localhost:5432/admin_db
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

- Password reset is intentionally disabled until a real delivery path exists.
- Auth is server-session backed. The SPA bootstraps identity from `GET /v1.0/auth/session`, and authenticated unsafe requests require the readable `csrf_token` cookie plus `X-CSRF-Token`.
- Kallisto no longer releases application verdicts. Partners can only inspect submitted applications and files; universities release decisions in their own systems.
- The frontend talks to the backend through one `/api` proxy during development.
- Staff observability is DB-backed for auth, partner, and staff traffic. Responses include `X-Request-Id`, and old log rows can be pruned with `psql -U postgres -d admin_db -f scripts/db/prune_observability.sql`.
- The canonical frontend routes are:
  - `/applicant/*`
  - `/partner/:universityId/*`
  - `/staff/*`

## Documentation

- [Setup](C:/Users/Vida/Documents/Kallisto/kallisto/docs/SETUP.md)
- [API](C:/Users/Vida/Documents/Kallisto/kallisto/docs/API.md)
- [Observability](C:/Users/Vida/Documents/Kallisto/kallisto/docs/OBSERVABILITY.md)
- `docs/ARCHITECTURE.md`
- `docs/MIGRATIONS.md`
