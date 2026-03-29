# Observability

## Scope

`service_logs` stores one structured row per completed request for all role-scoped runtime surfaces:

- `/v1.0/auth/*`
- `/v1.0/applicant/*`
- `/v1.0/partner/*`
- `/v1.0/staff/*`

Those responses also include `X-Request-Id` so staff can trace a request from the browser or API client into `service_logs`.

`audit_logs` stays narrower by design. It records security-sensitive and administrative events such as:

- sign-in success and failure
- sign-out
- unauthorized or forbidden partner/staff access
- partner/staff account creation
- university create, import, update, and delete
- application-structure update and publish
- settings updates

Applicant request traffic now has service-log parity, but applicant reads and writes are still not expanded into broad audit logging in this pass.

Ordinary response bodies, request bodies, cookies, JWTs, passwords, and uploaded file contents are intentionally excluded.

## Stored fields

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
