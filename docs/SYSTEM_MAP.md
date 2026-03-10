# Kallisto - System Map and Ports

## System Map (Dev)

[Browser]
   |
   | http://localhost:5173
   v
[Frontend: React SPA (Vite)]
   |
   | (Vite dev proxy)
   v
[Client Service: Go API]
   |  http://localhost:8081/v1.0
   |  - auth, profile, universities, applications
   |
   | application submit (POST /applications/receive)
   v
[Admin Service: Go API]
   |  http://localhost:8082/v1.0
   |  - admin auth, review workflow, university mgmt
   v
[Admin DB: admin_db]

[Client DB: client_db] <--- used by Client Service

## Ports
- Frontend (Vite dev): 5173
- Client API: 8081
- Admin API: 8082
- PostgreSQL: 5432 (default)

