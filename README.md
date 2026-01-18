# Kallisto

A full-stack university application management platform that helps students discover, apply to, and track university applications.

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

# Run migrations
psql -U postgres -d client_db -f scripts/migrations/client_db.sql
psql -U postgres -d admin_db -f scripts/migrations/admin_db.sql

# Seed data (optional)
psql -U postgres -d client_db -f scripts/seeds/universities_seed.sql
psql -U postgres -d admin_db -f scripts/seeds/admin_seed.sql

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
# Runs on http://localhost:8081

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
│   └── admin/              # Admin API (port 8081)
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
- [Architecture](docs/ARCHITECTURE.md) - System design and patterns
- [API Reference](docs/API.md) - Complete API documentation
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
│    Port 8080      │  (forwards    │    Port 8081      │
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

### Admin Service (Port 8081)

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
psql -U postgres -d client_db -f scripts/migrations/client_db.sql
psql -U postgres -d admin_db -f scripts/migrations/admin_db.sql
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
```

2.2 Write meaningful commit messages — nothing like `"shit, should've fixed"` will be accepted.

### 3. AI Guidelines

3.1 Do not litter the holy repository with AI trash unless you're 100% sure of what is happening there.

3.2 Only use AI as a search engine, not a code generator; it may hallucinate, and if we accept such a change, we may get fucked later.

3.3 Use Cursor if you want to generate code with AI.

---

## License

MIT
