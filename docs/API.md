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

Clears `access_token` and `session_meta` cookies.


#### POST /v1.0/password/forgot
Request password reset token email.

**Request:**
```json
{ "email": "student@example.com" }
```

**Response:** `200 OK`

Notes:
- Always returns a generic success response (enumeration-safe).
- Non-existing accounts return the same response without enqueue.

---

#### POST /v1.0/password/reset
Reset password by token.

**Request:**
```json
{ "token": "...", "new_password": "newStrongPass123" }
```

**Response:** `200 OK`

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

#### GET /v1.0/profile/test-scores 🔒
List saved standardized test scores for the signed-in student.

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "test_type": "IELTS",
    "other_test_name": null,
    "score": 7.5,
    "out_of": 9,
    "taken_on": "2026-02-12",
    "created_at": "2026-02-27T10:00:00Z",
    "updated_at": "2026-02-27T10:00:00Z"
  }
]
```

---

#### POST /v1.0/profile/test-scores 🔒
Create a profile test score.

**Request:**
```json
{
  "test_type": "OTHER",
  "other_test_name": "Duolingo English Test",
  "score": 125,
  "out_of": 160,
  "taken_on": "2026-01-10"
}
```

Notes:
- `test_type`: `IELTS | SAT | TOEFL | ACT | OTHER`
- `OTHER` requires `other_test_name`
- `score <= out_of`

**Response:** `201 Created`

---

#### PUT /v1.0/profile/test-scores/{id} 🔒
Update an existing profile test score.

**Response:** `200 OK`

---

#### DELETE /v1.0/profile/test-scores/{id} 🔒
Delete an existing profile test score.

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

#### POST /v1.0/applications/{universityId}/{cycle}/import-test-scores 🔒
Import saved profile test scores into a draft application.

**Request:**
```json
{
  "test_score_ids": ["uuid-1", "uuid-2"]
}
```

If `test_score_ids` is omitted, all saved profile test scores are imported.

**Response:** `200 OK`
```json
{
  "imported_count": 2,
  "test_scores": [
    {
      "id": "uuid-1",
      "test_type": "IELTS",
      "score": 7.5,
      "out_of": 9,
      "normalized": 0.8333
    }
  ]
}
```

Behavior:
- Draft-only operation (submitted applications are rejected).
- Writes `data.test_scores` in application payload.
- Also maps canonical top-level numeric keys: `ielts`, `sat`, `toefl`, `act` (best normalized score per test type).
- Stores a DB snapshot in `application_test_scores` for traceability.

---

#### DELETE /v1.0/applications/{universityId}/{cycle} 🔒
Delete application.

**Response:** `200 OK`

Only works for draft status.

---

#### POST /v1.0/application-files/upload 🔒
Upload one or more files for an application draft.

**Query Parameters:**
- `university_id` (UUID, required)
- `cycle` (required)
- `field_key` (optional)

**Content-Type:** `multipart/form-data`

**Form fields:**
- `files` (repeatable)

**Response:** `201 Created`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "passport.png",
      "type": "image/png",
      "size": 128934,
      "storage": "application_file",
      "download_url": "/api/v1.0/application-files/{fileId}/download"
    }
  ],
  "message": "files uploaded"
}
```

---

#### GET /v1.0/application-files/{fileId}/download 🔒
Download a previously uploaded file for the authenticated student.

**Response:** binary file stream.

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


#### POST /v1.0/password/forgot
Request admin password reset.

**Request:**
```json
{ "email": "admin@kallisto.uz" }
```

**Response:** `200 OK`

Notes:
- Always returns a generic success response (enumeration-safe).
- Non-existing accounts return the same response without enqueue.

---

#### POST /v1.0/password/reset
Reset admin password by token.

**Request:**
```json
{ "token": "...", "new_password": "newStrongPass123" }
```

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

#### GET /v1.0/applications/{id}/files/{fileId}/download 🔒
Download a submitted file asset.

- Staff can access any submitted application file.
- Partner accounts are restricted to files from their linked university applications.

**Response:** binary file stream.

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

`file_assets` may also be included when uploaded application files are present:
```json
{
  "file_assets": [
    {
      "id": "uuid",
      "field_key": "passport",
      "file_name": "passport.png",
      "content_type": "image/png",
      "file_size": 128934,
      "content_b64": "base64-bytes"
    }
  ]
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

### Superuser Global API (staff-only)

#### GET /v1.0/global/overview (auth required)
Returns global dashboard stats, recent activity, pending drafts, and system health metrics.

#### GET /v1.0/global/universities (auth required)
List global university rows for superuser management.

**Query Parameters:**
- `q` - search by name/location
- `status` - active/inactive/pending/suspended
- `type` - public/private/international
- `page`, `limit`

#### GET /v1.0/global/drafts (auth required)
List global drafts for approval.

**Query Parameters:**
- `q` - search by id/title/target
- `type` - draft type
- `status` - pending/approved/rejected/executed
- `page`, `limit`

#### POST /v1.0/global/drafts/{id}/approve (auth required)
Approve and execute a draft.

#### POST /v1.0/global/drafts/{id}/reject (auth required)
Reject a draft.

#### GET /v1.0/global/applications (auth required)
Global applications feed (staff scope).

#### GET /v1.0/global/users (auth required)
Global user moderation list.

#### POST /v1.0/global/users/{id}/ban-draft (auth required)
Create a ban-user draft for superuser workflow.

#### GET /v1.0/global/service-logs (auth required)
List service logs.

**Query Parameters:**
- `level`, `microservice`, `handler`, `user_id`, `time_range`
- `page`, `limit`

#### GET /v1.0/global/audit-logs (auth required)
List immutable audit logs.

**Query Parameters:**
- `q`, `action`, `outcome`, `page`, `limit`

#### GET /v1.0/global/settings (auth required)
Read global platform settings.

#### PUT /v1.0/global/settings (auth required)
Upsert global platform settings.

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

`(auth required)` = Requires authentication (`access_token` cookie)

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


## University Manager API Extensions (v4)

These endpoints are university-scoped and enforce partner/superuser university access.

### GET /v1.0/universities/{id}/dashboard (auth required)
Returns manager dashboard metrics including:
- `new_applications`, `total_applicants`, `avg_sat`, `avg_ielts`
- `male_count`, `female_count`
- `recent_applications[]`, `notifications[]`

### GET /v1.0/universities/{id}/staff (auth required)
List staff with pagination + filters: `search`, `role`, `status`, `page`, `limit`.
Response includes `items[]`, `invitations[]`, and `roles[]`.

### POST /v1.0/universities/{id}/staff (auth required)
Create a staff account linked to the university.

### PUT /v1.0/universities/{id}/staff/{staffId} (auth required)
Update staff profile and role.

### PUT /v1.0/universities/{id}/staff/{staffId}/status (auth required)
Update staff status (`active`, `suspended`, `pending`, `deactivated`).

### POST /v1.0/universities/{id}/staff/{staffId}/resend-invite (auth required)
Create a new invitation for that staff account.

### GET /v1.0/universities/{id}/application-structure/history (auth required)
List application structure version history.

### POST /v1.0/universities/{id}/application-structure/publish (auth required)
Publish current structure and create a version entry.

