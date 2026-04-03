# Kallisto Local Setup

This guide is for teammates setting up Kallisto on a local Windows or Linux machine.

Kallisto local development uses:
- Frontend dev server: `http://localhost:5173`
- Backend API: `http://localhost:8081/v1.0`
- PostgreSQL database: `admin_db` on port `5432`

For local development, use the bootstrap scripts under `scripts/db/`. They create the database if needed, apply migrations, and seed demo data.

The deployment-facing SQL entrypoint remains:
- `scripts/migrations/deploy_admin_db.sql`

## Prerequisites

- Go `1.24+`
- Node.js `18+`
- PostgreSQL `12+`
- Git

## Clone the repo

```bash
git clone <repository-url>
cd kallisto
```

## Windows Setup

### 1. Install prerequisites if missing

```powershell
winget install --id GoLang.Go -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id PostgreSQL.PostgreSQL.18 -e
```

Open a new PowerShell window after installs complete.

### 2. Go to the repo

```powershell
Set-Location C:\
```

### 3. Set your PostgreSQL password and `psql` path

Use the PostgreSQL superuser password you chose during install.

```powershell
$pgPassword = "YOUR_POSTGRES_PASSWORD"
$env:PGPASSWORD = $pgPassword
$env:PSQL_PATH = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
```

### 4. Create `.env`

```powershell
$secret = (([guid]::NewGuid().ToString("N")) + ([guid]::NewGuid().ToString("N")))
@"
APP_ENV=development
DATABASE_URL=postgres://postgres:$pgPassword@localhost:5432/admin_db
SECRET_KEY=$secret
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
CORS_ALLOWED_ORIGINS=http://localhost:5173
"@ | Set-Content .env
```

### 5. Bootstrap local database and seed demo data

```powershell
powershell -ExecutionPolicy Bypass -File scripts\db\bootstrap.ps1 `
  -CreateDatabases `
  -SeedProfile dev `
  -Database admin_db `
  -DbUser postgres `
  -DbHost localhost `
  -DbPort 5432
```

### 6. Start backend

Run this in terminal 1:

```powershell
go run services\backend\cmd\main.go
```

### 7. Start frontend

Run this in terminal 2:

```powershell
Set-Location frontend
npm install
npm run dev
```

## Linux Setup

These commands target Ubuntu or Debian. If your distro differs, install equivalent packages first.

### 1. Install prerequisites

```bash
sudo apt update
sudo apt install -y golang-go nodejs npm postgresql postgresql-contrib git
```

### 2. Go to the repo

```bash
cd /path/to/kallisto
```

### 3. Set your PostgreSQL password

```bash
export PGPASSWORD='YOUR_POSTGRES_PASSWORD'
```

### 4. Create `.env`

```bash
secret="$(cat /proc/sys/kernel/random/uuid | tr -d '-')$(cat /proc/sys/kernel/random/uuid | tr -d '-')"
cat > .env <<EOF
APP_ENV=development
DATABASE_URL=postgres://postgres:${PGPASSWORD}@localhost:5432/admin_db
SECRET_KEY=${secret}
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
CORS_ALLOWED_ORIGINS=http://localhost:5173
EOF
```

### 5. Bootstrap local database and seed demo data

```bash
bash scripts/db/bootstrap.sh \
  --create-databases \
  --seed-profile dev \
  --database admin_db \
  --db-user postgres \
  --db-host localhost \
  --db-port 5432
```

### 6. Start backend

Run this in terminal 1:

```bash
go run services/backend/cmd/main.go
```

### 7. Start frontend

Run this in terminal 2:

```bash
cd frontend
npm install
npm run dev
```

## Verification

After both processes are running:

- Frontend should open at `http://localhost:5173`
- Backend API should answer at `http://localhost:8081/v1.0`
- Frontend dev proxy uses `/api`

## Seed Accounts

The development seed profile creates:

- Staff: `admin@kallisto.uz` / `admin123`
- Partner: `manager@kallisto.uz` / `admin123`
- Applicant: create via `/auth/sign-up`

## Manual commands

If you do not want the full bootstrap flow, these are the underlying steps.

### Apply migrations only

Linux/macOS:

```bash
psql -U postgres -d admin_db -f scripts/migrations/deploy_admin_db.sql
```

Windows PowerShell:

```powershell
$env:PSQL_PATH='C:\Program Files\PostgreSQL\18\bin\psql.exe'
& $env:PSQL_PATH -U postgres -d admin_db -f scripts/migrations/deploy_admin_db.sql
```

### Apply seeds only

Linux/macOS:

```bash
bash scripts/db/apply_seeds.sh --seed-profile dev --database admin_db --db-user postgres --db-host localhost --db-port 5432
```

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/db/apply_seeds.ps1 -SeedProfile dev -Database admin_db -DbUser postgres -DbHost localhost -DbPort 5432
```

### Import universities JSON only

Linux/macOS:

```bash
go run scripts/seeds/cmd/import_universities/main.go --database-url "$DATABASE_URL"
```

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/seeds/import_universities.ps1 -Database admin_db -DbUser postgres -DbHost localhost -DbPort 5432
```

## Runtime notes

- Local `ver2` uses session-backed auth with an `HttpOnly` `access_token` cookie whose JWT carries `sid`.
- Successful sign-in depends on the `auth_sessions` table existing. If sign-in fails after a partial setup, rerun bootstrap or reapply migrations.
- Authenticated unsafe requests require the readable `csrf_token` cookie and matching `X-CSRF-Token` header.
- Frontend session bootstrap comes from `GET /v1.0/auth/session`.
- Password reset routes currently exist but return `503 Service Unavailable`.
- Application verdicts are not handled in Kallisto.

## Troubleshooting

### Sign-in fails with missing `auth_sessions`

Your database is partially migrated. Re-run bootstrap:

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\db\bootstrap.ps1 `
  -CreateDatabases `
  -SeedProfile dev `
  -Database admin_db `
  -DbUser postgres `
  -DbHost localhost `
  -DbPort 5432
```

Linux:

```bash
bash scripts/db/bootstrap.sh \
  --create-databases \
  --seed-profile dev \
  --database admin_db \
  --db-user postgres \
  --db-host localhost \
  --db-port 5432
```

### Seed script says `Cannot overwrite variable Host`

Update to the current repo version. That PowerShell collision bug was fixed in `scripts/seeds/import_universities.ps1`.

### Frontend gets `403 Forbidden` on save or submit

Check:

- backend is running from the current repo code
- `.env` contains `CORS_ALLOWED_ORIGINS=http://localhost:5173`
- browser has both `access_token` and `csrf_token` cookies
- frontend is actually running on `http://localhost:5173`
