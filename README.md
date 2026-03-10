# Kallisto

Kallisto is a monorepo for a university application platform.

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Go (Gorilla Mux)
- Database: PostgreSQL

## Services

- Frontend: `http://localhost:5173`
- Client API: `http://localhost:8081/v1.0`
- Admin API: `http://localhost:8082/v1.0`

## Quick Start

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

### 3. Seed development data (optional)

Linux/macOS:

```bash
bash scripts/db/apply_seeds.sh --seed-profile dev --client-db client_db --admin-db admin_db --db-user postgres --db-host localhost --db-port 5432
```

Windows (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/db/apply_seeds.ps1 -SeedProfile dev -ClientDb client_db -AdminDb admin_db -DbUser postgres -DbHost localhost -DbPort 5432
```

### 4. Configure `.env`

```env
DB_CONNECTION_URL=postgres://postgres:yourpassword@localhost:5432/client_db
ADMIN_DB_CONNECTION_URL=postgres://postgres:yourpassword@localhost:5432/admin_db
SECRET_KEY=your-secret-key-at-least-32-characters-long
ADMIN_SERVICE_URL=http://localhost:8082
CLIENT_PASSWORD_RESET_URL=http://localhost:5173/auth/reset-password?portal=student
ADMIN_PASSWORD_RESET_URL=http://localhost:5173/auth/reset-password?portal=management
```

### 5. Run services

```bash
# terminal 1
go run services/client/cmd/main.go

# terminal 2
go run services/admin/cmd/main/main.go

# terminal 3
cd frontend
npm install
npm run dev
```

## Seed Accounts

- Superuser: `admin@kallisto.uz` / `admin123`
- Manager: `manager@kallisto.uz` / `admin123`
- KBTU Manager: `kbtu.manager@kallisto.uz` / `admin123`

## Documentation

- `docs/SETUP.md`
- `docs/MIGRATIONS.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/PROJECT_UPDATES.md`

## Repository Layout

```text
frontend/
services/client/
services/admin/
infra/
scripts/migrations/
scripts/seeds/
docs/
```
