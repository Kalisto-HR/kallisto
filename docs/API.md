# Kallisto - API Documentation

## Base URLs

| Service | URL |
|---------|-----|
| Client API | http://localhost:8080/v1.0 |
| Admin API | http://localhost:8082/v1.0 |

## Authentication

All protected endpoints require a valid JWT token in the `access_token` cookie.

Cookie is automatically set on successful signin/signup.

---

## Client Service API

### Authentication

#### POST /v1.0/signup
Create a new applicant account.

**Request:**
```json
{
  "email": "student@example.com",
  "password": "password123",
  "first_name": "Test",
  "last_name": "TestLast"
}
```

**Response:** `200 OK`
```json
{
  "msg": "ok"
}
```
Sets `access_token` cookie.

**Validation:**
- email: required, valid format
- password: required, min 8 characters
- first_name: required
- last_name: required

---

#### POST /v1.0/signin
Sign in to existing account.

**Request:**
```json
{
  "email": "student@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "msg": "ok"
}
```
Sets `access_token` cookie.

---

#### GET /v1.0/signout
Sign out and clear session.

**Response:** `200 OK`

Clears `access_token` cookie.

---

#### GET /v1.0/me 🔒
Get current user info from JWT.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "first_name": "John",
  "last_name": "Doe",
  "role": "applicant"
}
```

---

### Profile

#### GET /v1.0/profile 🔒
Get full profile.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "student@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "data": {},
  "photo": null,
  "last_seen": "2026-01-15T10:00:00Z"
}
```

---

#### PUT /v1.0/profile 🔒
Update profile.

**Request:**
```json
{
  "first_name": "Johnny",
  "last_name": "Doe",
  "data": { "phone": "+998901234567" }
}
```

All fields optional (partial update).

**Response:** `200 OK`

---

#### DELETE /v1.0/profile 🔒
Delete account.

**Response:** `200 OK`

Clears cookie and deletes user.

---

### Universities

#### GET /v1.0/universities
List universities (paginated).

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "National University",
      "province": "Tashkent",
      "ranking": 1,
      "application_fee": 50.00
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "total_pages": 5
}
```

---

#### GET /v1.0/universities/search
Search universities.

**Query Parameters:**
- `q` - search query (name)
- `province` - filter by province
- `page`, `limit`

**Response:** Same as list.

---

#### GET /v1.0/universities/{id}
Get university details.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "manager_id": "uuid",
  "name": "National University",
  "description": "...",
  "province": "Tashkent",
  "ranking": 1,
  "application_fee": 50.00,
  "application_schema": { ... },
  "metadata": { ... },
  "created_at": "2026-01-01T00:00:00Z"
}
```

---

### Favorites

#### GET /v1.0/favorites 🔒
Get list of favorite universities.

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "National University",
    "province": "Tashkent",
    "ranking": 1
  }
]
```

---

#### GET /v1.0/universities/{id}/favorite 🔒
Check if university is favorited.

**Response:** `200 OK`
```json
{
  "is_favorite": true
}
```

---

#### POST /v1.0/universities/{id}/favorite 🔒
Add to favorites.

**Response:** `200 OK`
```json
{
  "msg": "ok"
}
```

---

#### DELETE /v1.0/universities/{id}/favorite 🔒
Remove from favorites.

**Response:** `200 OK`
```json
{
  "msg": "ok"
}
```

---

### Applications

#### GET /v1.0/applications 🔒
List user's applications.

**Response:** `200 OK`
```json
[
  {
    "university_id": "uuid",
    "university_name": "National University",
    "application_cycle": "2026-Spring",
    "status": "draft",
    "created_at": "2026-01-15T10:00:00Z",
    "submitted_at": null
  }
]
```

---

#### POST /v1.0/applications 🔒
Create new application.

**Request:**
```json
{
  "university_id": "uuid",
  "application_cycle": "2026-Spring",
  "data": {}
}
```

**Response:** `201 Created`
```json
{
  "msg": "ok"
}
```

---

#### GET /v1.0/applications/{universityId}/{cycle} 🔒
Get application details.

**Response:** `200 OK`
```json
{
  "user_id": "uuid",
  "university_id": "uuid",
  "application_cycle": "2026-Spring",
  "status": "draft",
  "data": { ... },
  "submitted_at": null,
  "created_at": "2026-01-15T10:00:00Z"
}
```

---

#### PUT /v1.0/applications/{universityId}/{cycle} 🔒
Update draft application.

**Request:**
```json
{
  "data": { "gpa": 3.8, "essay": "..." }
}
```

**Response:** `200 OK`

Only works for draft status.

---

#### POST /v1.0/applications/{universityId}/{cycle}/submit 🔒
Submit application.

**Response:** `200 OK`
```json
{
  "msg": "ok"
}
```

Changes status to "submitted", sets submitted_at, forwards to admin service.

Only works for draft status.

---

#### DELETE /v1.0/applications/{universityId}/{cycle} 🔒
Delete application.

**Response:** `200 OK`

Only works for draft status.

---

## Admin Service API

### Authentication

#### POST /v1.0/signin
Admin sign in.

**Request:**
```json
{
  "email": "admin@kallisto.uz",
  "password": "admin123"
}
```

**Response:** `200 OK` + sets cookie

---

#### GET /v1.0/signout
Admin sign out.

**Response:** `200 OK`

---

#### POST /v1.0/signup 🔒
Create admin account (requires existing admin).

**Request:**
```json
{
  "email": "partner@university.uz",
  "password": "password123",
  "first_name": "Partner",
  "last_name": "User",
  "role": "partner",
  "university_linked": "uuid"
}
```

**Response:** `201 Created`
```json
{
  "msg": "ok",
  "id": "uuid"
}
```

**Validation:**
- role: must be "staff" or "partner"
- partner accounts require university_linked

---

#### GET /v1.0/me 🔒
Get current admin info.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "first_name": "Admin",
  "last_name": "User",
  "role": "staff"
}
```

---

### Applications

#### GET /v1.0/applications 🔒
List submitted applications.

**Query Parameters:**
- `university_id` - filter by university
- `status` - filter by status (pending/reviewing/accepted/rejected)
- `page` (default: 1)
- `limit` (default: 20)

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "university_id": "uuid",
      "application_cycle": "2026-Spring",
      "applicant_info": {
        "email": "student@example.com",
        "first_name": "John",
        "last_name": "Doe"
      },
      "application_data": { ... },
      "submitted_at": "2026-01-15T10:00:00Z",
      "received_at": "2026-01-15T10:00:01Z",
      "status": "pending",
      "reviewed_by": null,
      "reviewed_at": null,
      "notes": null
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "total_pages": 3
}
```

Partners only see applications for their linked university.

---

#### GET /v1.0/applications/{id} 🔒
Get application details.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "university_id": "uuid",
  "application_cycle": "2026-Spring",
  "applicant_info": { ... },
  "application_data": { ... },
  "submitted_at": "2026-01-15T10:00:00Z",
  "received_at": "2026-01-15T10:00:01Z",
  "status": "pending",
  "reviewed_by": null,
  "reviewed_at": null,
  "notes": null
}
```

---

#### POST /v1.0/applications/receive
Receive application from client service (service-to-service).

**Request:**
```json
{
  "user_id": "uuid",
  "university_id": "uuid",
  "application_cycle": "2026-Spring",
  "applicant_info": {
    "email": "student@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "application_data": { ... },
  "submitted_at": "2026-01-15T10:00:00Z"
}
```

**Response:** `201 Created`
```json
{
  "msg": "application received"
}
```

---

#### PUT /v1.0/applications/{id}/review 🔒
Review application.

**Request:**
```json
{
  "status": "accepted",
  "notes": "Strong candidate"
}
```

**Response:** `200 OK`
```json
{
  "msg": "application reviewed"
}
```

**Valid statuses:** pending, reviewing, accepted, rejected

---

### Universities

#### GET /v1.0/universities 🔒
List all universities (paginated).

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)

**Response:** `200 OK`
```json
{
  "items": [ ... ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "total_pages": 5
}
```

---

#### GET /v1.0/universities/{id} 🔒
Get university details.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "manager_id": "uuid",
  "name": "National University",
  "description": "...",
  "province": "Tashkent",
  "ranking": 1,
  "application_fee": 50.00,
  "application_schema": { ... },
  "metadata": { ... },
  "created_at": "2026-01-01T00:00:00Z"
}
```

---

#### POST /v1.0/universities 🔒
Create university.

**Request:**
```json
{
  "name": "New University",
  "description": "...",
  "province": "Tashkent",
  "ranking": 10,
  "application_fee": 40.00,
  "application_schema": { ... },
  "metadata": { ... }
}
```

**Response:** `201 Created`
```json
{
  "msg": "university created",
  "id": "uuid"
}
```

---

#### PUT /v1.0/universities/{id} 🔒
Update university.

**Request:**
```json
{
  "name": "Updated Name",
  "ranking": 5
}
```

All fields optional (partial update).

**Response:** `200 OK`
```json
{
  "msg": "university updated"
}
```

---

#### DELETE /v1.0/universities/{id} 🔒
Delete university.

**Response:** `200 OK`
```json
{
  "msg": "university deleted"
}
```

---

#### PUT /v1.0/universities/{id}/manager 🔒
Assign partner as manager.

**Request:**
```json
{
  "manager_id": "uuid"
}
```

**Response:** `200 OK`
```json
{
  "msg": "manager assigned"
}
```

---

## Error Responses

### 400 Bad Request - Validation Error
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

### 400 Bad Request - Malformed JSON
```json
{
  "msg": "malformed json request body"
}
```

### 401 Unauthorized
```json
{
  "msg": "unauthorized"
}
```

### 404 Not Found
```json
{
  "msg": "application not found"
}
```

### 409 Conflict
```json
{
  "msg": "application already exists for this cycle"
}
```

### 500 Internal Server Error
```json
{
  "msg": "failed to perform database query"
}
```

---

## Status Codes Summary

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Internal Server Error |

---

## Legend

🔒 = Requires authentication (access_token cookie)

---

## Testing with cURL

### Sign Up
```bash
curl -X POST http://localhost:8080/v1.0/signup \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"password123","first_name":"Test","last_name":"User"}'
```

### Sign In
```bash
curl -X POST http://localhost:8080/v1.0/signin \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Get Profile (Protected)
```bash
curl -X GET http://localhost:8080/v1.0/profile \
  -b cookies.txt
```

### List Universities
```bash
curl -X GET "http://localhost:8080/v1.0/universities?page=1&limit=10"
```

### Create Application
```bash
curl -X POST http://localhost:8080/v1.0/applications \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"university_id":"uuid-here","application_cycle":"2026-Spring","data":{}}'
```

### Admin Sign In
```bash
curl -X POST http://localhost:8082/v1.0/signin \
  -H "Content-Type: application/json" \
  -c admin-cookies.txt \
  -d '{"email":"admin@kallisto.uz","password":"admin123"}'
```

### Review Application (Admin)
```bash
curl -X PUT http://localhost:8082/v1.0/applications/uuid-here/review \
  -H "Content-Type: application/json" \
  -b admin-cookies.txt \
  -d '{"status":"accepted","notes":"Great candidate"}'
```

