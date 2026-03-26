# Kallisto System Map and Ports

## System map (development)

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
   |-- applicant reads/writes --> [client_db]
   |-- management reads/writes -> [admin_db]
   |
   |-- university sync --------> [client_db.universities]
   |-- submission copy --------> [admin_db.submitted_applications]
```

## Current runtime notes

- The supported backend is one Go process, not two separate services.
- The frontend uses one API proxy: `/api`.
- There is no supported `/adminapi` proxy.
- There is no supported service-to-service submit hop like `POST /applications/receive`.

## Core flow map

### Auth

- Unified sign-in hits `/v1.0/auth/sign-in`
- Backend resolves the user from `admin_db.users` or `client_db.users`
- JWT + session metadata cookies are issued

### Applicant application flow

1. Applicant reads university data from `client_db.universities`
2. Applicant stores drafts in `client_db.applications`
3. On submit, backend writes management-side submission into `admin_db`
4. Backend then marks the applicant row as `submitted`

### Partner/staff flow

- Partners operate within the linked university context
- Staff operate on platform-wide routes
- Both read submitted applications from `admin_db`
- Submitted applications and files are read-only in the supported flow

## Ports

- Frontend (Vite dev): `5173`
- Backend API: `8081`
- PostgreSQL: `5432` by default

## Public route namespaces

- `/auth/*`
- `/applicant/*`
- `/partner/:universityId/*`
- `/staff/*`
