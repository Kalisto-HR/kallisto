## Features

- **User Authentication** - Secure signup/signin with JWT-based sessions
- **University Search** - Browse and search universities with filters
- **Application Management** - Create, edit, save drafts, and submit applications
- **Favorites** - Save universities for later
- **Admin Dashboard** - Review applications, manage universities (separate service)

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router |
| Backend | Go 1.24, Gorilla Mux, PostgreSQL (pgx driver) |
| Auth | Custom JWT (HS256), bcrypt, HttpOnly cookies |
| Infra | Zap logging, connection pooling, middleware pipeline |

## Quick Start

### Prerequisites

- Go 1.24.0+
- Node.js 18+
- PostgreSQL 12+

### Setup

```bash
# Clone repository
git clone <repository-url>
cd kallisto

# Create databases
psql -U postgres -c "CREATE DATABASE client_db;"
psql -U postgres -c "CREATE DATABASE admin_db;"

# Run migrations (strict ordered apply)
powershell -ExecutionPolicy Bypass -File scripts/db/apply_migrations.ps1 -ClientDb client_db -AdminDb admin_db -DbUser postgres -DbHost localhost -DbPort 5432

# Seed data (optional; dev profile)
powershell -ExecutionPolicy Bypass -File scripts/db/apply_seeds.ps1 -SeedProfile dev -ClientDb client_db -AdminDb admin_db -DbUser postgres -DbHost localhost -DbPort 5432

# Optional (avoid repeated password prompts and explicit psql lookup)
$env:PGPASSWORD="your_postgres_password"
$env:PSQL_PATH="C:\Program Files\PostgreSQL\17\bin\psql.exe"

# Create .env file
cat > .env << EOF
DB_CONNECTION_URL=postgres://postgres:yourpassword@localhost:5432/client_db
ADMIN_DB_CONNECTION_URL=postgres://postgres:yourpassword@localhost:5432/admin_db
SECRET_KEY=your-secret-key-at-least-32-characters-long
EOF
```

### Run

```bash
# Terminal 1: Client Service
go run services/client/cmd/main.go
# Runs on http://localhost:8080

# Terminal 2: Admin Service
go run services/admin/cmd/main/main.go
# Runs on http://localhost:8082

# Terminal 3: Frontend
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Test Accounts

After seeding:

| Service | Email | Password |
|---------|-------|----------|
| Admin | admin@kallisto.uz | admin123 |
| Manager | manager@kallisto.uz | admin123 |
| KBTU Manager | kbtu.manager@kallisto.uz | admin123 |

## Project Structure

```
kallisto/
├── frontend/                # React SPA
│   ├── src/
│   │   ├── api/            # API client & types
│   │   ├── components/     # Reusable components
│   │   ├── context/        # Auth context
│   │   ├── pages/          # Page components
│   │   └── utils/          # Validation utilities
│   └── ...
│
├── services/
│   ├── client/             # Client-facing API (port 8080)
│   │   ├── cmd/            # Entry point
│   │   └── internal/       # Handlers, models, usecases
│   │
│   └── admin/              # Admin API (port 8082)
│       └── (same structure)
│
├── infra/                  # Shared infrastructure
│   ├── auth/jwt/          # JWT utilities
│   ├── middlewares/       # HTTP middlewares
│   ├── validation/        # Input validation
│   ├── utils/             # Response helpers
│   └── logger/            # Logging setup
│
├── scripts/
│   ├── migrations/        # SQL schema files
│   └── seeds/             # Test data
│
└── docs/                  # Documentation
    ├── SETUP.md           # Developer setup guide
    ├── ARCHITECTURE.md    # System architecture
    ├── API.md             # API reference
    └── TESTING_CHECKLIST.md
```

## Documentation

- [Setup Guide](docs/SETUP.md) - Development environment setup
- [Migrations](docs/MIGRATIONS.md) - Canonical migration and seed order/scripts
- [Architecture](docs/ARCHITECTURE.md) - System design and patterns
- [API Reference](docs/API.md) - Complete API documentation
- [Project Updates](docs/PROJECT_UPDATES.md) - Latest delivered changes and migration notes
- [Testing Checklist](docs/TESTING_CHECKLIST.md) - Manual testing guide

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                    React SPA (Vite)                             │
│                  http://localhost:5173                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                    (Vite dev proxy)
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
┌───────────────────┐               ┌───────────────────┐
│  CLIENT SERVICE   │──────────────▶│  ADMIN SERVICE    │
│    Port 8080      │  (forwards    │    Port 8082      │
│                   │  applications)│                   │
│  - Auth           │               │  - Auth           │
│  - Profile        │               │  - Applications   │
│  - Universities   │               │  - Universities   │
│  - Applications   │               │  - Review         │
│  - Favorites      │               │                   │
└─────────┬─────────┘               └─────────┬─────────┘
          │                                   │
          ▼                                   ▼
┌───────────────────┐               ┌───────────────────┐
│    client_db      │               │    admin_db       │
│   (PostgreSQL)    │               │   (PostgreSQL)    │
└───────────────────┘               └───────────────────┘
```

## API Overview

### Client Service (Port 8080)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /v1.0/signup | Create account |
| POST | /v1.0/signin | Sign in |
| GET | /v1.0/signout | Sign out |
| GET | /v1.0/me | Get current user |
| GET | /v1.0/profile | Get profile |
| PUT | /v1.0/profile | Update profile |
| GET | /v1.0/universities | List universities |
| GET | /v1.0/universities/search | Search universities |
| GET | /v1.0/universities/{id} | University details |
| GET | /v1.0/favorites | List favorites |
| POST | /v1.0/universities/{id}/favorite | Add favorite |
| DELETE | /v1.0/universities/{id}/favorite | Remove favorite |
| GET | /v1.0/applications | List applications |
| POST | /v1.0/applications | Create application |
| GET | /v1.0/applications/{uid}/{cycle} | Get application |
| PUT | /v1.0/applications/{uid}/{cycle} | Update application |
| POST | /v1.0/applications/{uid}/{cycle}/submit | Submit |
| DELETE | /v1.0/applications/{uid}/{cycle} | Delete |

### Admin Service (Port 8082)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /v1.0/signin | Admin sign in |
| GET | /v1.0/signout | Admin sign out |
| POST | /v1.0/signup | Create admin (staff only) |
| GET | /v1.0/applications | List submitted applications |
| GET | /v1.0/applications/{id} | Application details |
| PUT | /v1.0/applications/{id}/review | Review application |
| GET | /v1.0/universities | List universities |
| POST | /v1.0/universities | Create university |
| PUT | /v1.0/universities/{id} | Update university |
| DELETE | /v1.0/universities/{id} | Delete university |
| GET | /v1.0/global/overview | Superuser dashboard payload |
| GET | /v1.0/global/drafts | Superuser drafts queue |
| POST | /v1.0/global/drafts/{id}/approve | Approve+execute draft |
| GET | /v1.0/global/audit-logs | Superuser audit log feed |
| GET/PUT | /v1.0/global/settings | Read/update global settings |

## Development

### Commands

```bash
# Build
go build -o bin/client services/client/cmd/main.go
go build -o bin/admin services/admin/cmd/main/main.go
cd frontend && npm run build

# Test
go test ./...
cd frontend && npm run lint

# Database reset
powershell -ExecutionPolicy Bypass -File scripts/db/apply_migrations.ps1 -ClientDb client_db -AdminDb admin_db -DbUser postgres -DbHost localhost -DbPort 5432
```

---

## Repository Guidelines

### 1. Coding Guidelines

1.1 It is a monorepository, so whatever microservice/project concerning Kallisto you wanna add, add here.

1.2 Use camelCase for Golang (PascalCase for only public variables/methods); that is how the conventions are set.

1.3 Write concise logic, test, and question everything.

1.4 Do not cuddle everything or abuse newlines; try to be clean as if it is a USSR handwriting class.

1.5 If you are using concurrency, always know that channels > mutex; that is just the Golang way of doing asynchronous code.

1.6 Place everything under proper hierarchy or namespaces.

1.7 Use generics as much as you know, and always prefer flexibility to avoid future legacy issues.

1.8 **IMPORTANT:** No direct merges to the main repository; everyone makes their branch, adds their features, and opens a merge request, which the team will review and approve/suggest changes.

1.9 Maintain proper documentation.

1.10 Escort every sensitive adjustment with proper testing; otherwise, I will not approve the Pull Request.

### 2. Pull Request Guidelines

2.1 In the title, first say what you're doing (refactor, feat, fix, bug, typo), followed by the domain of the changes:
```
feat merge_sort: enabling custom data_types
``

