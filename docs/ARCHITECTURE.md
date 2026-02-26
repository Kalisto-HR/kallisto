# Kallisto - System Architecture

## Overview

Kallisto is a university application management platform built as a microservices architecture with a React frontend.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│                         React SPA (Vite)                                │
│                       http://localhost:5173                             │
│                                                                         │
│  Routes:                                                                │
│  - / (Home)           - /signin, /signup                               │
│  - /dashboard         - /search                                         │
│  - /applications      - /university/:id                                │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                          (Vite dev proxy)
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT SERVICE                                  │
│                         Go (Gorilla Mux)                                │
│                        http://localhost:8080                            │
│                                                                         │
│  Responsibilities:                                                      │
│  - Applicant authentication                                             │
│  - Profile management                                                   │
│  - University browsing                                                  │
│  - Application creation & submission                                    │
│  - Favorites management                                                 │
│                                                                         │
│  Database: client_db                                                    │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                    (HTTP POST on application submit)
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          ADMIN SERVICE                                   │
│                         Go (Gorilla Mux)                                │
│                        http://localhost:8082                            │
│                                                                         │
│  Responsibilities:                                                      │
│  - Staff/partner authentication                                         │
│  - Application review workflow                                          │
│  - University management (source of truth)                              │
│  - Blacklist management                                                 │
│                                                                         │
│  Database: admin_db                                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

## Service Details

### Client Service (Port 8080)

| Layer | Location | Purpose |
|-------|----------|---------|
| Handlers | `services/client/internal/handlers/` | HTTP request handling |
| Usecases | `services/client/internal/usecases/` | Business logic |
| Models | `services/client/internal/models/` | Data structures |

**Endpoints:**
- Auth: `/v1.0/signup`, `/v1.0/signin`, `/v1.0/signout`
- Profile: `/v1.0/me`, `/v1.0/profile`
- Applications: `/v1.0/applications/*`
- Universities: `/v1.0/universities/*`
- Favorites: `/v1.0/favorites`

### Admin Service (Port 8082)

| Layer | Location | Purpose |
|-------|----------|---------|
| Handlers | `services/admin/internal/handlers/` | HTTP request handling |
| Usecases | `services/admin/internal/usecases/` | Business logic |
| Models | `services/admin/internal/models/` | Data structures |

**Endpoints:**
- Auth: `/v1.0/signin`, `/v1.0/signout`, `/v1.0/signup`
- Applications: `/v1.0/applications/*`, `/v1.0/applications/receive`
- Universities: `/v1.0/universities/*`

### Shared Infrastructure

| Module | Location | Purpose |
|--------|----------|---------|
| JWT | `infra/auth/jwt/` | Token creation & validation |
| Middlewares | `infra/middlewares/` | Request logging, DB injection, auth |
| Validation | `infra/validation/` | Input validation helpers |
| Utils | `infra/utils/` | JSON responses, HTTP client, errors |
| Logger | `infra/logger/` | Zap logger setup |
| Env | `infra/env/` | Environment loading |

## Authentication

### JWT Token Structure

```
Header: { "alg": "hs256", "typ": "jwt" }
Claims: { "uid", "first_name", "last_name", "role", "iat" }
```

| Property | Value |
|----------|-------|
| Algorithm | HS256 |
| TTL | 15 minutes |
| Auto-extend | At 75% of TTL |
| Storage | HttpOnly cookie (`access_token`) |

### Auth Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Client  │         │  Server  │         │    DB    │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │
     │ POST /signin       │                    │
     │ {email, password}  │                    │
     │───────────────────▶│                    │
     │                    │ Query user         │
     │                    │───────────────────▶│
     │                    │◀───────────────────│
     │                    │                    │
     │                    │ Verify bcrypt      │
     │                    │ Generate JWT       │
     │                    │                    │
     │ Set-Cookie:        │                    │
     │ access_token=...   │                    │
     │◀───────────────────│                    │
     │                    │                    │
     │ GET /profile       │                    │
     │ Cookie: access_... │                    │
     │───────────────────▶│                    │
     │                    │ Validate JWT       │
     │                    │ Extract claims     │
     │                    │───────────────────▶│
     │                    │◀───────────────────│
     │ 200 OK + data      │                    │
     │◀───────────────────│                    │
```

## Data Flow

### Application Submission

```
1. User creates draft (client_db.applications, status='draft')
         │
         ▼
2. User edits and saves draft (updates applications.data)
         │
         ▼
3. User submits (status='submitted', submitted_at=NOW())
         │
         ▼
4. Client service POSTs to Admin service /applications/receive
         │
         ▼
5. Admin service stores in submitted_applications (status='pending')
         │
         ▼
6. Admin reviews and updates status (accepted/rejected)
```

### University Data Sync

Universities table exists in both databases:
- **admin_db.universities** → Source of truth (admins can edit)
- **client_db.universities** → Read replica (applicants can view)

Sync strategy (to be implemented):
- Admin updates university → Triggers sync to client_db
- Options: Event-driven (message queue) or scheduled job

## Database Schema

### Client Database (client_db)

```
┌─────────────────┐     ┌──────────────────┐
│     users       │     │   universities   │
├─────────────────┤     ├──────────────────┤
│ id (PK, UUID)   │     │ id (PK, UUID)    │
│ email (UNIQUE)  │     │ name             │
│ password        │     │ description      │
│ first_name      │     │ province         │
│ last_name       │     │ ranking          │
│ data (JSONB)    │     │ application_fee  │
└────────┬────────┘     └────────┬─────────┘
         │                       │
         │    ┌──────────────────┘
         │    │
         ▼    ▼
┌─────────────────────────────────────┐
│           applications              │
├─────────────────────────────────────┤
│ user_id (PK, FK)                    │
│ university_id (PK, FK)              │
│ application_cycle (PK)              │
│ status (draft/submitted/...)        │
│ data (JSONB)                        │
│ submitted_at                        │
│ created_at                          │
└─────────────────────────────────────┘
```

### Admin Database (admin_db)

```
┌─────────────────┐     ┌──────────────────┐
│     users       │     │   universities   │
├─────────────────┤     ├──────────────────┤
│ id (PK, UUID)   │     │ id (PK, UUID)    │
│ email (UNIQUE)  │     │ manager_id (FK)  │
│ password        │     │ name             │
│ first_name      │     │ description      │
│ last_name       │     │ province         │
│ role (staff/    │     │ ranking          │
│       partner)  │     │ application_fee  │
│ university_     │     └────────┬─────────┘
│   linked (FK)   │              │
└─────────────────┘              │
                                 │
┌────────────────────────────────┼────────────────────────────────┐
│                                ▼                                │
│              submitted_applications                             │
├─────────────────────────────────────────────────────────────────┤
│ id (PK, UUID)                                                   │
│ user_id (applicant from client service)                         │
│ university_id (FK)                                              │
│ application_cycle                                               │
│ applicant_info (JSONB)                                          │
│ application_data (JSONB)                                        │
│ status (pending/reviewing/accepted/rejected)                    │
│ reviewed_by (FK → users)                                        │
│ reviewed_at                                                     │
│ notes                                                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          blacklist                               │
├─────────────────────────────────────────────────────────────────┤
│ id (PK, UUID)                                                   │
│ passport_no                                                      │
│ email                                                           │
│ reason                                                          │
│ expires_at                                                      │
│ created_by (FK → users)                                         │
└─────────────────────────────────────────────────────────────────┘
```

## API Versioning

All endpoints use `/v1.0/` prefix for versioning.

## Response Formats

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "ok",
  "timestamp": 1234567890
}
```

### Error Response

```json
{
  "success": false,
  "message": "error description"
}
```

### Validation Errors

```json
{
  "success": false,
  "message": "validation failed",
  "errors": [
    { "field": "email", "message": "must be a valid email address" },
    { "field": "password", "message": "is required" }
  ]
}
```

### Paginated Response

```json
{
  "items": [ ... ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "total_pages": 5
}
```

## Security Measures

| Measure | Implementation |
|---------|----------------|
| Password hashing | bcrypt (DefaultCost) |
| JWT signing | HMAC-SHA256 with SECRET_KEY |
| Cookie security | HttpOnly, Secure, SameSite=Lax |
| SQL injection | Parameterized queries (pgx) |
| Input validation | Server-side validation on all inputs |
| XSS prevention | React auto-escapes, no dangerouslySetInnerHTML |
| CSRF protection | SameSite cookies |

## File Structure

```
kallisto/
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── api/             # API client functions
│   │   ├── components/      # Reusable components
│   │   ├── context/         # React contexts (Auth)
│   │   ├── pages/           # Page components
│   │   └── utils/           # Utilities (validation)
│   └── ...
│
├── services/
│   ├── client/              # Client-facing service
│   │   ├── cmd/             # Entry point
│   │   └── internal/
│   │       ├── handlers/    # HTTP handlers
│   │       ├── models/      # Data models
│   │       └── usecases/    # Business logic
│   │
│   └── admin/               # Admin service
│       └── (same structure)
│
├── infra/                   # Shared infrastructure
│   ├── auth/jwt/           # JWT utilities
│   ├── middlewares/        # HTTP middlewares
│   ├── validation/         # Input validation
│   ├── utils/              # Helpers (responses, errors)
│   ├── logger/             # Logging setup
│   └── env/                # Environment loading
│
├── scripts/
│   ├── migrations/         # Database schemas
│   └── seeds/              # Seed data
│
└── docs/                   # Documentation
    ├── SETUP.md
    ├── ARCHITECTURE.md
    └── TESTING_CHECKLIST.md
```

## Middleware Chain

```
Request
   │
   ▼
LogRequestEvent (logs method, URI)
   │
   ▼
PassPgPoolConn (injects DB pool into context)
   │
   ▼
[RequireAuth] (validates JWT, injects claims - protected routes only)
   │
   ▼
Handler
   │
   ▼
Response
```

## Future Considerations

1. **University Data Sync** - Implement event-driven sync from admin_db to client_db
2. **Admin Frontend** - Build React admin dashboard
3. **File Uploads** - University logos, application documents
4. **Email Notifications** - Application status updates
5. **Rate Limiting** - Protect auth endpoints
6. **Caching** - Redis for university listings
7. **Monitoring** - Prometheus metrics, structured logging

