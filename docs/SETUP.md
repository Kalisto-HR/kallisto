# Kallisto - Developer Setup Guide

## Prerequisites

- Go 1.24.0+
- Node.js 18+
- PostgreSQL 12+
- Git

## Quick Start

### 1. Clone Repository
```bash
git clone <repository-url>
cd kallisto
```

### 2. Database Setup
```bash
# Start PostgreSQL service

# Create databases
psql -U postgres -c "CREATE DATABASE client_db;"
psql -U postgres -c "CREATE DATABASE admin_db;"

# Run migrations
psql -U postgres -d client_db -f scripts/migrations/client_db.sql
psql -U postgres -d admin_db -f scripts/migrations/admin_db.sql
psql -U postgres -d client_db -f scripts/migrations/client_db_v2_university_compare.sql
psql -U postgres -d admin_db -f scripts/migrations/admin_db_v2_university_fields.sql

# Seed data (optional but recommended for development)
go run scripts/seeds/cmd/import_universities/main.go
psql -U postgres -d admin_db -f scripts/seeds/admin_seed.sql
```
`scripts/seeds/import_universities.ps1` and `scripts/seeds/universities_seed.sql` are kept as legacy alternatives.

If your PostgreSQL user requires a password:
```bash
$env:PGPASSWORD="yourpassword"
go run scripts/seeds/cmd/import_universities/main.go
```

### ACCESSING THE DATABASE
psql -U postgres -d client_db
type your own password
### 3. Environment Configuration

Create `.env` in project root:
```env
# Client Service Database
# MAKE SURE YOU TYPE YOUR OWN POSTGRE PASSWORD IN THE DB CONNECTION URL
DB_CONNECTION_URL=postgres://postgres:yourpassword@localhost:5432/client_db

# Admin Service Database
ADMIN_DB_CONNECTION_URL=postgres://postgres:yourpassword@localhost:5432/admin_db

# JWT Secret (min 32 characters)
SECRET_KEY=your-secret-key-at-least-32-characters-long

# Admin Service URL (for client service to forward applications)
ADMIN_SERVICE_URL=http://localhost:8082
```

### 4. Run Backend Services
```bash
# Terminal 1: Client Service (port 8080)
go run services/client/cmd/main.go

# Terminal 2: Admin Service (port 8082)
go run services/admin/cmd/main/main.go
```

### 5. Run Frontend
```bash
# Terminal 3
cd frontend
npm install
npm run dev
# Opens on http://localhost:5173
```

### 6. Verify Setup

1. Open http://localhost:5173
2. Create account at /signup
3. Sign in at /signin
4. Browse universities at /search
5. Create an application

## Database Schema

### Client Database (client_db)

| Table | Description |
|-------|-------------|
| users | Applicants/students |
| universities | University listings (read replica) |
| applications | Application drafts and submissions |

### Admin Database (admin_db)

| Table | Description |
|-------|-------------|
| users | Staff and partner accounts |
| universities | University data (source of truth) |
| submitted_applications | Applications received from client |
| blacklist | Blocked applicants |
| drafts | Admin action drafts |

## Common Commands

| Task | Command |
|------|---------|
| Build client service | `go build -o bin/client services/client/cmd/main.go` |
| Build admin service | `go build -o bin/admin services/admin/cmd/main/main.go` |
| Build frontend | `cd frontend && npm run build` |
| Run all tests | `go test ./...` |
| Run frontend tests | `cd frontend && npm test` |
| Lint frontend | `cd frontend && npm run lint` |
| Seed universities from JSON | `go run scripts/seeds/cmd/import_universities/main.go` |
| Reset client DB | `psql -U postgres -d client_db -f scripts/migrations/client_db.sql` |
| Reset admin DB | `psql -U postgres -d admin_db -f scripts/migrations/admin_db.sql` |

## Ports

| Service | Port |
|---------|------|
| Client API | 8080 |
| Admin API | 8082 |
| Frontend Dev | 5173 |

## Test Accounts

After seeding:

**Admin Service:**
- Email: admin@kallisto.uz
- Password: admin123

## Troubleshooting

### "connection refused" on database
- Ensure PostgreSQL service is running
- Check connection URL in `.env` matches your PostgreSQL setup
- Verify database exists: `psql -U postgres -c "\l"`

### "database does not exist"
```bash
psql -U postgres -c "CREATE DATABASE client_db;"
psql -U postgres -c "CREATE DATABASE admin_db;"
```

### "relation does not exist"
Run migrations:
```bash
psql -U postgres -d client_db -f scripts/migrations/client_db.sql
psql -U postgres -d admin_db -f scripts/migrations/admin_db.sql
```

### Frontend can't connect to API
- Ensure backend service is running on port 8080
- Check Vite proxy config in `frontend/vite.config.ts`
- Verify CORS settings if running on different hosts

### "unauthorized" errors
- JWT token may be expired (15 min TTL)
- Sign out and sign in again
- Clear browser cookies for localhost

### Admin service not receiving applications
- Ensure admin service is running on port 8082
- Check `ADMIN_SERVICE_URL` in `.env`
- Review client service logs for forwarding errors

### Go module errors
```bash
go mod tidy
go mod download
```

### Node module errors
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## API Endpoints Reference

### Client Service (port 8080)

**Public:**
- `POST /v1.0/signup` - Register new user
- `POST /v1.0/signin` - Login
- `GET /v1.0/signout` - Logout
- `GET /v1.0/universities` - List universities
- `GET /v1.0/universities/search?q=` - Search universities
- `GET /v1.0/universities/{id}` - Get university details

**Protected (requires auth):**
- `GET /v1.0/me` - Get current user
- `GET /v1.0/profile` - Get profile
- `PUT /v1.0/profile` - Update profile
- `GET /v1.0/applications` - List user's applications
- `POST /v1.0/applications` - Create application
- `GET /v1.0/applications/{universityId}/{cycle}` - Get application
- `PUT /v1.0/applications/{universityId}/{cycle}` - Update application
- `POST /v1.0/applications/{universityId}/{cycle}/submit` - Submit application
- `DELETE /v1.0/applications/{universityId}/{cycle}` - Delete application
- `GET /v1.0/favorites` - Get favorite universities
- `POST /v1.0/universities/{id}/favorite` - Add to favorites
- `DELETE /v1.0/universities/{id}/favorite` - Remove from favorites

### Admin Service (port 8082)

**Public:**
- `POST /v1.0/signin` - Admin login
- `GET /v1.0/signout` - Admin logout
- `POST /v1.0/applications/receive` - Receive application (service-to-service)

**Protected (requires auth):**
- `POST /v1.0/signup` - Create admin account (staff only)
- `GET /v1.0/me` - Get current admin
- `GET /v1.0/applications` - List submitted applications
- `GET /v1.0/applications/{id}` - Get application details
- `PUT /v1.0/applications/{id}/review` - Review application
- `GET /v1.0/universities` - List universities
- `POST /v1.0/universities` - Create university
- `GET /v1.0/universities/{id}` - Get university
- `PUT /v1.0/universities/{id}` - Update university
- `DELETE /v1.0/universities/{id}` - Delete university
- `PUT /v1.0/universities/{id}/manager` - Assign manager

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐
│    Frontend     │     │  Admin Frontend │
│   (React SPA)   │     │    (Future)     │
│   Port: 5173    │     │                 │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ Client Service  │────▶│  Admin Service  │
│   Port: 8080    │     │   Port: 8082    │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   client_db     │     │    admin_db     │
│  (PostgreSQL)   │     │  (PostgreSQL)   │
└─────────────────┘     └─────────────────┘
```

## Development Workflow

1. Create feature branch from `main`
2. Make changes following coding conventions
3. Run tests: `go test ./...`
4. Run linter: `cd frontend && npm run lint`
5. Submit PR for review
6. Ensure CI passes before merge

**Conventions:**
- Go: `camelCase`, `PascalCase` for exported
- TypeScript: `camelCase`, `PascalCase` for components
- Commits: `feat|fix|refactor/domain: description`
