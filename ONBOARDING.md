# Kallisto - Project Documentation & Onboarding Guide

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Architecture](#4-architecture)
5. [Backend Services](#5-backend-services)
6. [Frontend Application](#6-frontend-application)
7. [Authentication System](#7-authentication-system)
8. [Database Schema](#8-database-schema)
9. [API Reference](#9-api-reference)
10. [Configuration & Environment](#10-configuration--environment)
11. [Development Workflow](#11-development-workflow)
12. [Getting Started](#12-getting-started)

---

## 1. Project Overview

**Kallisto** is a full-stack web application for university applications management. It helps students navigate universities, manage applications, and discover academic opportunities. The platform is built as a monorepo with separate frontend and backend services.

### Key Features

- **User Authentication** - Sign up, sign in, sign out with secure JWT-based sessions
- **Profile Management** - User profile creation and updates
- **University Search** - Browse and search universities
- **Application Management** - Create, submit, and track university applications
- **Admin Dashboard** - Administrative tools for managing applicants and applications

### Project Status

| Feature | Status |
|---------|--------|
| User Authentication (Sign Up/Sign In) | Implemented |
| JWT Token Management | Implemented |
| Database Schema | Implemented |
| Frontend Routing & UI | Implemented |
| Auth Context & Protected Routes | Implemented |
| Profile Management | Implemented |
| Application Management (CRUD + Submit) | Implemented |
| University Search & Browsing | Implemented |
| Favorites System | Implemented |
| Admin Service | Stub implementations |

---

## 2. Tech Stack

### Frontend

| Component | Technology | Version |
|-----------|-----------|---------|
| UI Framework | React | 19.2.0 |
| Language | TypeScript | ~5.9.3 |
| Build Tool | Vite | 7.2.4 |
| CSS Framework | Tailwind CSS | 4.1.17 |
| Routing | React Router | 6.28.0 |
| Linting | ESLint | 9.39.1 |

### Backend

| Component | Technology | Version |
|-----------|-----------|---------|
| Language | Go | 1.24.0 |
| HTTP Router | Gorilla Mux | 1.8.1 |
| Database | PostgreSQL | pgx v5.7.6 |
| Logging | Uber Zap | 1.27.0 |
| Password Hashing | bcrypt | golang.org/x/crypto |
| Authentication | Custom JWT (HS256) | - |

### Database

- **Type**: PostgreSQL
- **Driver**: pgx/v5 (native Go PostgreSQL driver)
- **Connection**: pgxpool (connection pooling)

---

## 3. Project Structure

```
kallisto/
├── .gitignore                     # Git ignore rules
├── docker.compose.yml             # Docker compose config (empty)
├── go.mod                         # Go module definition
├── go.sum                         # Go dependencies checksum
├── Makefile                       # Build commands
├── README.md                      # Repository guidelines
│
├── frontend/                      # React SPA (330 KB)
│   ├── index.html                 # HTML entry point
│   ├── package.json               # npm dependencies
│   ├── vite.config.ts             # Vite bundler configuration
│   ├── tsconfig.json              # TypeScript configuration
│   ├── tailwind.config.js         # Tailwind CSS theme
│   ├── eslint.config.js           # ESLint configuration
│   │
│   ├── public/
│   │   └── logo.svg               # Kallisto logo
│   │
│   └── src/
│       ├── main.tsx               # React entry point
│       ├── App.tsx                # Main app with routing
│       │
│       ├── api/
│       │   ├── client.ts          # API client utility
│       │   ├── types.ts           # TypeScript types matching backend models
│       │   ├── applications.ts    # Application API functions
│       │   ├── favorites.ts       # Favorites API functions
│       │   └── universities.ts    # University API functions
│       │
│       ├── context/
│       │   └── AuthContext.tsx    # Authentication state management
│       │
│       ├── components/
│       │   ├── Layout.tsx         # Root layout wrapper
│       │   ├── ProtectedRoute.tsx # Auth-required route wrapper
│       │   └── SearchBox.tsx      # University search component
│       │
│       ├── pages/
│       │   ├── Home.tsx           # Landing page
│       │   ├── SignIn.tsx         # Login page
│       │   ├── SignUp.tsx         # Registration page
│       │   ├── Dashboard.tsx      # User dashboard
│       │   ├── Search.tsx         # University search
│       │   ├── UniversityDetail.tsx # University info with favorites
│       │   ├── Applications.tsx   # User applications list
│       │   ├── ApplicationDetail.tsx # Application form view/edit
│       │   ├── Error.tsx          # Error display
│       │   └── Default.tsx        # 404/Not Implemented
│       │
│       └── styles/
│           ├── global.css         # Global styles
│           ├── auth.css           # Auth page styling
│           ├── SearchBox.css
│           └── UniversityDetail.css
│
├── services/                      # Backend microservices
│   ├── client/                    # Client-facing service
│   │   ├── cmd/
│   │   │   └── main.go            # Service entry point
│   │   │
│   │   ├── docs/
│   │   │   └── endpoints/         # API documentation (YAML)
│   │   │
│   │   └── internal/
│   │       ├── handlers/          # HTTP handlers
│   │       │   ├── sign_in.go
│   │       │   ├── sign_out.go
│   │       │   ├── sign_up.go
│   │       │   ├── profile.go
│   │       │   ├── applications.go
│   │       │   ├── universities.go
│   │       │   └── favorites.go
│   │       │
│   │       ├── models/
│   │       │   ├── user.go        # User data models
│   │       │   ├── profile.go     # Profile models
│   │       │   ├── application.go # Application models
│   │       │   └── university.go  # University models
│   │       │
│   │       └── usecases/usecases_impl/
│   │           ├── sign_in_usecases_impl.go
│   │           ├── sign_up_usecases_impl.go
│   │           ├── profile_usecases_impl.go
│   │           ├── application_usecases_impl.go
│   │           ├── university_usecases_impl.go
│   │           └── favorites_usecases_impl.go
│   │
│   └── admin/                     # Admin service
│       ├── cmd/main/
│       │   └── main.go            # Admin entry point
│       │
│       ├── docs/endpoints/        # API documentation
│       │
│       └── internal/
│           ├── handlers/
│           ├── models/
│           └── usecases/
│
├── infra/                         # Shared infrastructure (20 KB)
│   ├── auth/jwt/
│   │   ├── jwt.go                 # JWT creation & validation
│   │   ├── content.go             # JWT header & claims
│   │   └── errors.go              # JWT-specific errors
│   │
│   ├── env/
│   │   └── env.go                 # .env file loader
│   │
│   ├── logger/
│   │   └── logger.go              # Zap logger setup
│   │
│   ├── middlewares/
│   │   └── middlewares.go         # HTTP middlewares
│   │
│   └── utils/
│       ├── errors.go              # HTTP error handling
│       ├── response.go            # Standardized JSON responses
│       └── utils.go               # JSON response utilities
│
├── scripts/
│   ├── migrations/
│   │   └── client_db.sql          # PostgreSQL schema
│   └── seeds/                     # Database seed data
│
└── docs/
    └── TESTING_CHECKLIST.md       # Manual testing guide
```

---

## 4. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                    React SPA (Vite)                             │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│   │   Home   │  │  SignIn  │  │Dashboard │  │  Search  │       │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│        │             │             │             │               │
│        └─────────────┴─────────────┴─────────────┘               │
│                           │                                      │
│                    API Client (fetch)                            │
└───────────────────────────┼─────────────────────────────────────┘
                            │ HTTP (JSON + Cookies)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│                                                                  │
│  ┌─────────────────────┐      ┌─────────────────────┐          │
│  │   Client Service    │      │   Admin Service     │          │
│  │    (Port 8080)      │      │    (Port 8080)      │          │
│  │                     │      │                     │          │
│  │  ┌───────────────┐  │      │  ┌───────────────┐  │          │
│  │  │   Handlers    │  │      │  │   Handlers    │  │          │
│  │  └───────┬───────┘  │      │  └───────┬───────┘  │          │
│  │          │          │      │          │          │          │
│  │  ┌───────▼───────┐  │      │  ┌───────▼───────┐  │          │
│  │  │   Usecases    │  │      │  │   Usecases    │  │          │
│  │  └───────┬───────┘  │      │  └───────┬───────┘  │          │
│  │          │          │      │          │          │          │
│  │  ┌───────▼───────┐  │      │  ┌───────▼───────┐  │          │
│  │  │    Models     │  │      │  │    Models     │  │          │
│  │  └───────────────┘  │      │  └───────────────┘  │          │
│  └──────────┬──────────┘      └──────────┬──────────┘          │
│             │                            │                      │
│             └────────────┬───────────────┘                      │
│                          │                                      │
│  ┌───────────────────────▼───────────────────────────────────┐  │
│  │                SHARED INFRASTRUCTURE                       │  │
│  │  ┌─────────┐ ┌─────────────┐ ┌────────┐ ┌───────┐        │  │
│  │  │   JWT   │ │ Middlewares │ │ Logger │ │ Utils │        │  │
│  │  └─────────┘ └─────────────┘ └────────┘ └───────┘        │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       PostgreSQL                                 │
│  ┌─────────────┐  ┌──────────────────┐  ┌─────────────────┐    │
│  │    users    │  │   universities   │  │  applications   │    │
│  └─────────────┘  └──────────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Design Patterns

- **Clean Architecture**: Handlers → Usecases → Models
- **Middleware Pattern**: Request logging, DB connection injection, authentication
- **Dependency Injection**: Database pool passed via context
- **Microservices**: Separate client and admin services

---

## 5. Backend Services

### Client Service

**Purpose**: Public-facing API for applicants/students

**Entry Point**: `services/client/cmd/main.go`

**Port**: 8080

**Middleware Chain**:
```
Request → LogRequestEvent → PassPgPoolConn → [RequireAuth] → Handler → Response
```

### Admin Service

**Purpose**: Administrative dashboard API for managing applications

**Entry Point**: `services/admin/cmd/main/main.go`

**Port**: 8080

**Status**: Stub implementations (not yet functional)

### Shared Infrastructure (`infra/`)

| Module | Location | Purpose |
|--------|----------|---------|
| JWT | `infra/auth/jwt/` | Token creation, validation, expiry checking |
| Middlewares | `infra/middlewares/` | Request logging, DB injection, auth |
| Logger | `infra/logger/` | Zap logger initialization |
| Environment | `infra/env/` | .env file loading |
| Utils | `infra/utils/` | JSON responses, error handling |

---

## 6. Frontend Application

### Component Hierarchy

```
<BrowserRouter>
  └── <AuthProvider>
      └── <App>
          └── <Routes>
              ├── <Home />                              "/"
              ├── <Search />                            "/search"
              ├── <UniversityDetail />                  "/university/:id"
              ├── <SignIn />                            "/signin"
              ├── <SignUp />                            "/signup"
              ├── <Error />                             "/error"
              │
              │ (Protected Routes - require authentication)
              ├── <ProtectedRoute>
              │   └── <Dashboard />                     "/dashboard"
              ├── <ProtectedRoute>
              │   └── <Applications />                  "/applications"
              ├── <ProtectedRoute>
              │   └── <ApplicationDetail />             "/applications/:universityId/:cycle"
              ├── <ProtectedRoute>
              │   └── <ApplicationDetail />             "/applications/:universityId/:cycle/edit"
              │
              └── <NotFound />                          "/*"
```

### State Management

- **Approach**: React Hooks (useState, useEffect, useMemo) + Context API
- **No external state library** (no Redux, Zustand, etc.)
- **Form state**: Local component state
- **Authentication**: AuthContext + Cookie-based sessions (HttpOnly)

#### AuthContext

**Location**: `frontend/src/context/AuthContext.tsx`

Provides global authentication state management:

```typescript
type AuthContextType = {
  user: User | null;           // Current user or null
  isAuthenticated: boolean;    // Whether user is logged in
  isLoading: boolean;          // Loading state during auth check
  checkAuth: () => Promise<void>;  // Re-check authentication
  logout: () => Promise<void>;     // Sign out user
};
```

**Usage**:
```typescript
import { useAuth } from "../context/AuthContext";

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();
  // ...
}
```

### API Client

**Location**: `frontend/src/api/client.ts`

```typescript
export async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(`/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    credentials: "include", // Include cookies
    ...options
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
```

### API Type Definitions

**Location**: `frontend/src/api/types.ts`

Centralized TypeScript types matching backend API models:

```typescript
// Response wrappers
interface ApiResponse<T> { success: boolean; data: T; message: string; }
interface PaginatedResponse<T> { items: T[]; total: number; page: number; limit: number; }

// Domain models
interface User { id: string; email: string; firstName: string; lastName: string; role: string; }
interface University { id: string; name: string; province: string | null; ranking: number | null; ... }
interface Application { user_id: string; university_id: string; status: ApplicationStatus; ... }
type ApplicationStatus = 'draft' | 'submitted' | 'accepted' | 'rejected';
```

### Styling

**Framework**: Tailwind CSS 4.1.17 with custom theme

**Color Palette**:
| Color | Hex | Usage |
|-------|-----|-------|
| Primary Blue | `#003A81` | Headings, footer |
| Brand Green | `#006D3E` | Action buttons |
| Light Green | `#5FB22E` | Hover states |
| Dark Green | `#1a4d3a` | Card backgrounds |

### Routes

| Path | Component | Auth Required | Description |
|------|-----------|---------------|-------------|
| `/` | Home | No | Landing page |
| `/signin` | SignIn | No | Login form |
| `/signup` | SignUp | No | Registration form |
| `/search` | Search | No | University search |
| `/university/:id` | UniversityDetail | No | University info with favorites |
| `/dashboard` | Dashboard | Yes | User dashboard |
| `/applications` | Applications | Yes | User applications list |
| `/applications/:universityId/:cycle` | ApplicationDetail | Yes | View application |
| `/applications/:universityId/:cycle/edit` | ApplicationDetail | Yes | Edit application |
| `/error` | Error | No | Error display |
| `/*` | NotFound | No | 404 page |

---

## 7. Authentication System

### JWT Structure

**Algorithm**: HMAC-SHA256

**Token Format**: `header.claims.signature` (Base64 encoded)

```go
// Header
type Header struct {
    Alg string // "hs256"
    Typ string // "jwt"
}

// Claims (Payload)
type Claims struct {
    UID       string // User ID (UUID)
    FirstName string
    LastName  string
    Role      string // "applicant" or "admin"
    Iat       int64  // Issued at (unix timestamp)
}
```

### Token Lifecycle

| Stage | Duration | Action |
|-------|----------|--------|
| Creation | - | New token on sign-in/sign-up |
| Valid | 0-75% of TTL | Token accepted, no action |
| Near Expiry | 75-100% of TTL | Token auto-extended |
| Expired | >15 minutes | 401 Unauthorized |

**TTL**: 900 seconds (15 minutes)

### Authentication Flow

```
┌──────────────────────────────────────────────────────────────┐
│                        SIGN UP FLOW                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Client                         Server                       │
│    │                              │                          │
│    │  POST /v1.0/signup           │                          │
│    │  {email, first_name,         │                          │
│    │   last_name, password}       │                          │
│    │────────────────────────────>│                          │
│    │                              │                          │
│    │                              │ 1. Hash password (bcrypt)│
│    │                              │ 2. Insert user to DB     │
│    │                              │ 3. Generate JWT          │
│    │                              │                          │
│    │  200 OK                      │                          │
│    │  Set-Cookie: access_token    │                          │
│    │<────────────────────────────│                          │
│    │                              │                          │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                        SIGN IN FLOW                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Client                         Server                       │
│    │                              │                          │
│    │  POST /v1.0/signin           │                          │
│    │  {email, password}           │                          │
│    │────────────────────────────>│                          │
│    │                              │                          │
│    │                              │ 1. Query user by email   │
│    │                              │ 2. Verify password       │
│    │                              │ 3. Generate JWT          │
│    │                              │                          │
│    │  200 OK                      │                          │
│    │  Set-Cookie: access_token    │                          │
│    │<────────────────────────────│                          │
│    │                              │                          │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    PROTECTED REQUEST FLOW                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Client                         Server                       │
│    │                              │                          │
│    │  GET /v1.0/profile           │                          │
│    │  Cookie: access_token=...    │                          │
│    │────────────────────────────>│                          │
│    │                              │                          │
│    │                              │ 1. Extract cookie        │
│    │                              │ 2. Validate JWT          │
│    │                              │ 3. Check expiry          │
│    │                              │ 4. Extend if needed      │
│    │                              │                          │
│    │  200 OK + Response           │                          │
│    │  [Set-Cookie if extended]    │                          │
│    │<────────────────────────────│                          │
│    │                              │                          │
└──────────────────────────────────────────────────────────────┘
```

### Cookie Configuration

```go
http.Cookie{
    Name:     "access_token",
    Value:    tokenString,
    Path:     "/",
    HttpOnly: true,              // Not accessible via JavaScript
    Secure:   true,              // HTTPS only
    SameSite: http.SameSiteStrictMode, // CSRF protection
}
```

### Security Features

| Feature | Implementation |
|---------|----------------|
| Password Storage | bcrypt hashing (DefaultCost) |
| JWT Signing | HMAC-SHA256 with SECRET_KEY |
| Cookie Security | HttpOnly + Secure + SameSite=Strict |
| SQL Injection | Parameterized queries (pgx) |
| CSRF Protection | SameSite=Strict cookies |

---

## 8. Database Schema

### Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────┐
│       users         │       │    universities     │
├─────────────────────┤       ├─────────────────────┤
│ id (PK, UUID)       │       │ id (PK, UUID)       │
│ email (UNIQUE)      │       │ manager_id (FK)     │
│ password (bcrypt)   │       │ name                │
│ first_name          │       │ description         │
│ last_name           │       │ province            │
│ data (JSONB)        │       │ logo (BYTEA)        │
│ last_seen           │       │ ranking             │
│ photo (BYTEA)       │       │ application_schema  │
└─────────┬───────────┘       │ application_fee     │
          │                   │ metadata (JSONB)    │
          │                   │ created_at          │
          │                   └─────────┬───────────┘
          │                             │
          │    ┌────────────────────────┘
          │    │
          ▼    ▼
┌─────────────────────────────────────────────┐
│              applications                    │
├─────────────────────────────────────────────┤
│ user_id (PK, FK → users.id)                 │
│ university_id (PK, FK → universities.id)    │
│ application_cycle (PK)                      │
│ status ('draft'|'submitted'|'accepted'|     │
│         'rejected')                         │
│ data (JSONB)                                │
│ submitted_at                                │
│ created_at                                  │
└─────────────────────────────────────────────┘
```

### Tables

#### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,        -- bcrypt hashed
    first_name TEXT,
    last_name TEXT,
    data JSONB,                    -- encrypted personal data
    last_seen TIMESTAMP,
    photo BYTEA
);

CREATE INDEX idx_users_email ON users(email);
```

#### universities
```sql
CREATE TABLE universities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID,               -- FK to admin
    name TEXT NOT NULL,
    logo BYTEA,
    description TEXT,
    province TEXT,
    application_schema JSONB,      -- Dynamic form schema
    ranking INT,
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB,
    application_fee FLOAT
);

CREATE INDEX idx_universities_ranking ON universities(ranking);
```

#### applications
```sql
CREATE TABLE applications (
    user_id UUID NOT NULL,
    university_id UUID NOT NULL,
    application_cycle TEXT NOT NULL,
    status TEXT CHECK (status IN ('draft', 'submitted', 'accepted', 'rejected')),
    data JSONB,                    -- Application form data
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, university_id, application_cycle),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
);

CREATE INDEX idx_application_status ON applications(status);
```

### Go Models

```go
// services/client/internal/models/user.go
type User struct {
    Id        string `db:"id"`
    Email     string `db:"email"`
    FirstName string `db:"first_name"`
    LastName  string `db:"last_name"`
    Password  string `db:"password"`
}

type SignUpRequest struct {
    Email     string `json:"email"`
    FirstName string `json:"first_name"`
    LastName  string `json:"last_name"`
    Password  string `json:"password"`
}

type SignInRequest struct {
    Email    string `json:"email"`
    Password string `json:"password"`
}

// services/client/internal/models/application.go
type Application struct {
    UserID           string          `db:"user_id" json:"user_id"`
    UniversityID     string          `db:"university_id" json:"university_id"`
    ApplicationCycle string          `db:"application_cycle" json:"application_cycle"`
    Status           string          `db:"status" json:"status"`
    Data             json.RawMessage `db:"data" json:"data"`
    SubmittedAt      *time.Time      `db:"submitted_at" json:"submitted_at"`
    CreatedAt        time.Time       `db:"created_at" json:"created_at"`
}

// services/client/internal/models/university.go
type University struct {
    ID                string          `db:"id" json:"id"`
    ManagerID         *string         `db:"manager_id" json:"manager_id"`
    Name              string          `db:"name" json:"name"`
    Logo              []byte          `db:"logo" json:"logo"`
    Description       *string         `db:"description" json:"description"`
    Province          *string         `db:"province" json:"province"`
    ApplicationSchema json.RawMessage `db:"application_schema" json:"application_schema"`
    Ranking           *int            `db:"ranking" json:"ranking"`
    CreatedAt         time.Time       `db:"created_at" json:"created_at"`
    Metadata          json.RawMessage `db:"metadata" json:"metadata"`
    ApplicationFee    *float64        `db:"application_fee" json:"application_fee"`
}
```

---

## 9. API Reference

### Client Service Endpoints

#### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/v1.0/signup` | No | Register new user |
| POST | `/v1.0/signin` | No | Login user |
| GET | `/v1.0/signout` | No | Logout user |

**POST /v1.0/signup**
```json
// Request
{
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "password": "securepassword"
}

// Response: 200 OK
{ "msg": "ok" }
// + Set-Cookie: access_token=...
```

**POST /v1.0/signin**
```json
// Request
{
  "email": "user@example.com",
  "password": "securepassword"
}

// Response: 200 OK
{ "msg": "ok" }
// + Set-Cookie: access_token=...
```

**GET /v1.0/signout**
```
// Response: 200 OK
// Clears access_token cookie
```

#### Me (Protected - Lightweight Auth Check)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1.0/me` | Get current user info from JWT |

#### Profile (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1.0/profile` | Get user profile |
| PUT | `/v1.0/profile` | Update profile |
| DELETE | `/v1.0/profile` | Delete profile |

#### Applications (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1.0/applications` | List user's applications |
| POST | `/v1.0/applications` | Create new application |
| GET | `/v1.0/applications/{universityId}/{cycle}` | Get application details |
| PUT | `/v1.0/applications/{universityId}/{cycle}` | Update application |
| POST | `/v1.0/applications/{universityId}/{cycle}/submit` | Submit application |
| DELETE | `/v1.0/applications/{universityId}/{cycle}` | Delete application |

#### Universities (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1.0/universities` | List universities |
| GET | `/v1.0/universities/search` | Search universities |
| GET | `/v1.0/universities/{id}` | Get university details |

#### Favorites (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1.0/favorites` | Get user's favorite universities |
| GET | `/v1.0/universities/{id}/favorite` | Check if university is favorite |
| POST | `/v1.0/universities/{id}/favorite` | Add university to favorites |
| DELETE | `/v1.0/universities/{id}/favorite` | Remove from favorites |

### Admin Service Endpoints

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/v1.0/signin` | Admin login | Stub |
| GET | `/v1.0/signout` | Admin logout | Implemented |
| POST | `/v1.0/generate-account` | Create admin account | Not implemented |
| POST | `/v1.0/blacklist` | Blacklist user | Not implemented |
| GET | `/v1.0/applicants` | List applicants | Not implemented |
| GET/PUT/DELETE | `/v1.0/profile` | Profile management | Not implemented |
| GET/POST/DELETE | `/v1.0/drafts` | Draft management | Not implemented |

### Error Responses

```json
// 400 Bad Request
{ "msg": "malformed json request body" }

// 401 Unauthorized
{ "msg": "passwords did not match" }

// 404 Not Found
{ "msg": "could not find the user in the database" }

// 500 Internal Server Error
{ "msg": "failed to perform database query" }

// 501 Not Implemented
{ "msg": "NOT IMPLEMENTED" }
```

---

## 10. Configuration & Environment

### Environment Variables

Create a `.env` file in the project root:

```env
# Database connection string
DB_CONNECTION_URL=postgres://username:password@localhost:5432/client_db

# JWT signing secret (use a strong random string)
SECRET_KEY=your-super-secret-key-here
```

### Tailwind Configuration

**File**: `frontend/tailwind.config.js`

```javascript
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1a4d3a",
        brandBlue: "#003A81",
        brandGreen: "#006D3E",
        brandLight: "#5FB22E",
        card: "#ffffff",
      },
    },
  },
  plugins: [],
};
```

### TypeScript Configuration

**Frontend**: Strict mode, ES2022 target, ESNext modules

**Backend**: Go 1.24.0

---

## 11. Development Workflow

### Build Commands (Makefile)

```bash
# Build client service
make build-client

# Build admin service
make build-admin

# Build frontend and move to public directories
make build-frontend

# Clean public directories
make clean
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Backend Development

```bash
# Run client service
go run services/client/cmd/main.go

# Run admin service
go run services/admin/cmd/main/main.go

# Build binaries
go build -o bin/client services/client/cmd/main.go
go build -o bin/admin services/admin/cmd/main/main.go
```

### Database Setup

```bash
# Connect to PostgreSQL
psql -U postgres

# Run migrations
psql -U postgres -d postgres -f scripts/migrations/client_db.sql
```

### Testing

A comprehensive manual testing checklist is available at `docs/TESTING_CHECKLIST.md`.

**Quick Testing Commands**:
```bash
# Test auth endpoints
curl -X POST http://localhost:8080/v1.0/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","first_name":"Test","last_name":"User","password":"test123"}'

# Test protected endpoint (replace TOKEN with access_token cookie value)
curl -X GET http://localhost:8080/v1.0/profile \
  -H "Cookie: access_token=TOKEN"

# Test university search
curl "http://localhost:8080/v1.0/universities/search?q=oxford"
```

### Git Workflow

From `README.md`:
- No direct merges to `main` branch
- PR review mandatory
- Comprehensive testing required for sensitive changes
- Naming convention: `camelCase` (Go: `PascalCase` for public)

---

## 12. Getting Started

### Prerequisites

- **Go** 1.24.0+
- **Node.js** 18+ and npm
- **PostgreSQL** 12+
- **Git**

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd kallisto
```

### Step 2: Database Setup

```bash
# Start PostgreSQL service
# Create database
psql -U postgres -c "CREATE DATABASE client_db;"

# Run migrations
psql -U postgres -d client_db -f scripts/migrations/client_db.sql
```

### Step 3: Environment Configuration

```bash
# Create .env file in project root
cat > .env << EOF
DB_CONNECTION_URL=postgres://postgres:password@localhost:5432/client_db
SECRET_KEY=your-super-secret-key-change-this-in-production
EOF
```

### Step 4: Start Backend

```bash
# Terminal 1: Run client service
go run services/client/cmd/main.go
# Server starts on :8080
```

### Step 5: Start Frontend

```bash
# Terminal 2: Run frontend dev server
cd frontend
npm install
npm run dev
# Dev server starts on :5173
```

### Step 6: Access the Application

- **Frontend**: http://localhost:5173
- **API**: http://localhost:8080/v1.0/

### Testing the Auth Flow

1. Navigate to http://localhost:5173/signup
2. Create an account with email, name, and password
3. You'll be redirected to the dashboard
4. Navigate to http://localhost:5173/signin to test login
5. Check cookies in browser dev tools for `access_token`

---

## Quick Reference

### Key File Locations

| Purpose | Path |
|---------|------|
| Go dependencies | `go.mod` |
| Frontend dependencies | `frontend/package.json` |
| Client service entry | `services/client/cmd/main.go` |
| Admin service entry | `services/admin/cmd/main/main.go` |
| JWT implementation | `infra/auth/jwt/jwt.go` |
| Middlewares | `infra/middlewares/middlewares.go` |
| Database schema | `scripts/migrations/client_db.sql` |
| Frontend routing | `frontend/src/App.tsx` |
| Auth context | `frontend/src/context/AuthContext.tsx` |
| API client | `frontend/src/api/client.ts` |
| API types | `frontend/src/api/types.ts` |
| Protected route | `frontend/src/components/ProtectedRoute.tsx` |
| Testing checklist | `docs/TESTING_CHECKLIST.md` |
| Build commands | `Makefile` |

### Common Tasks

| Task | Command |
|------|---------|
| Build all | `make build-client && make build-admin && make build-frontend` |
| Run client service | `go run services/client/cmd/main.go` |
| Run frontend dev | `cd frontend && npm run dev` |
| Reset database | `psql -U postgres -d client_db -f scripts/migrations/client_db.sql` |
| Check types | `cd frontend && npx tsc --noEmit` |

---

## Contributing

1. Create a feature branch from `main`
2. Make changes following the coding conventions
3. Write tests for new functionality
4. Submit a PR for review
5. Ensure CI passes before merge

**Conventions**:
- Go: `camelCase`, `PascalCase` for exported
- TypeScript: `camelCase`, `PascalCase` for components
- Commit format: `feat|fix|refactor/domain: description`
