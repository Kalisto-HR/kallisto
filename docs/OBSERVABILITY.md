# Staff Observability

## Scope

`service_logs` records one structured row per completed request for:

- `/v1.0/auth/*`
- `/v1.0/partner/*`
- `/v1.0/staff/*`

`audit_logs` records:

- sign-in success and failure
- sign-out
- unauthorized or forbidden access to partner/staff routes
- management account creation
- university create, import, update, and delete
- application-structure update and publish
- draft approve and reject
- global settings update

Ordinary reads, request/response bodies, cookies, JWTs, passwords, and uploaded file contents are intentionally excluded.

## Stored Fields

`service_logs` stores:

- `logged_at`
- `level`
- `microservice`
- `handler`
- `message`
- `user_id`
- `request_id`
- `method`
- `status_code`
- `duration_ms`
- `role`
- `ip_address`
- `user_agent`
- `metadata`

`audit_logs` stores:

- `occurred_at`
- `actor_name`
- `actor_id`
- `actor_type`
- `action_type`
- `action_description`
- `target_entity`
- `target_id`
- `outcome`
- `ip_address`
- `request_id`
- `metadata`

## Retention

- `service_logs`: 30 days
- `audit_logs`: 365 days

Prune old rows with:

```bash
psql -U postgres -d admin_db -f scripts/db/prune_observability.sql
```
