# Kallisto System Map and Ports

## System map

```text
[Browser]
   |
   | http://localhost:5173
   v
[Frontend: React SPA (Vite)]
   |
   | /api
   | Vite dev proxy
   v
[Backend Monolith: Go API]
   |  http://localhost:8081/v1.0
   |
   |-- /auth/*
   |-- /applicant/*
   |-- /partner/*
   |-- /staff/*
   |
   |-- all reads/writes -------> [admin_db]
```

## Current runtime notes

- the supported backend is one Go process
- the frontend uses one API proxy: `/api`
- there is no supported `/adminapi` proxy
- there is no supported service-to-service submit hop like `POST /applications/receive`

## Core flow map

### Auth

- unified sign-in hits `/v1.0/auth/sign-in`
- backend resolves the user from unified `admin_db.users`
- JWT and CSRF cookies are issued

### Applicant application flow

1. Applicant reads university data from `admin_db.universities`
2. Applicant stores drafts in `admin_db.applications`
3. On submit, the backend commits the same application row as `submitted`
4. Partner and staff read submitted rows from the same table

### Partner and staff flow

- partners operate within linked university context
- staff operate on platform-wide routes
- both read submitted applications from `admin_db`
- submitted applications and files are read-only in the supported flow

## Ports

- Frontend (Vite dev): `5173`
- Backend API: `8081`
- PostgreSQL: `5432` by default

## Public route namespaces

- `/auth/*`
- `/applicant/*`
- `/partner/:universityId/*`
- `/staff/*`
