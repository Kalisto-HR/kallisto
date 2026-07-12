# Docker VM Deployment

This guide is the production-oriented path for running Kallisto from a fresh GitHub pull on a VM.

## 1. VM Prerequisites

- Docker Engine with Compose v2
- Git
- Ports opened only as needed:
  - `80` or your reverse proxy port for the frontend
  - keep `8081` and `5432` private unless you intentionally expose them

## 2. Clone Or Update

```bash
git clone <your-github-repo-url> kallisto-ver2
cd kallisto-ver2
```

For later updates:

```bash
git pull
```

## 3. Create The VM Environment File

```bash
cp .env.example .env
```

Edit `.env` and set:

- `POSTGRES_PASSWORD` to a strong database password
- `DATABASE_URL` with the same password and the Docker host `postgres`
- `SECRET_KEY` to a high-entropy value of at least 32 characters
- `CORS_ALLOWED_ORIGINS` to the real browser origin, for example `https://kallisto.ink`
- `COOKIE_SECURE=true` when serving over HTTPS
- `COOKIE_DOMAIN` only if cookies must be shared across subdomains

Generate a secret on Linux:

```bash
openssl rand -hex 32
```

## 4. Start The Stack

```bash
docker compose up -d --build
```

The compose stack runs in this order:

1. `postgres`
2. `migrator`, applying `scripts/migrations/schema.sql`
3. `university-seeder`, importing `scripts/seeds/data/universities.v2.json`
4. `admin-seeder`, applying `scripts/seeds/admin_seed.sql`
5. `backend`
6. `frontend`

The seeders are idempotent, so re-running `docker compose up -d --build` is safe for normal updates.

## 5. Verify

```bash
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
docker compose logs --tail=100 university-seeder
docker compose logs --tail=100 admin-seeder
```

Health checks:

```bash
curl http://127.0.0.1:${BACKEND_PORT:-8081}/healthz
curl http://127.0.0.1:${FRONTEND_PORT:-80}/healthz
```

If `FRONTEND_PORT=80`, open:

```text
http://your-vm-ip/
```

## 6. Reverse Proxy Notes

Recommended production layout:

- Public Nginx/Caddy/Traefik terminates HTTPS on `443`
- Proxy frontend traffic to `127.0.0.1:80` or set `FRONTEND_PORT=8080`
- Keep `BACKEND_BIND_ADDRESS=127.0.0.1`
- Keep `POSTGRES_BIND_ADDRESS=127.0.0.1`

The bundled frontend Nginx proxies API requests to the internal Docker backend service:

- `/v1.0/*`
- `/api/*`

## 7. Updating The VM

```bash
git pull
docker compose up -d --build
docker compose ps
```

## 8. Backups

Before risky updates, back up Postgres:

```bash
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > kallisto_backup.sql
```

Restore into an empty database only:

```bash
cat kallisto_backup.sql | docker compose exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

## 9. Important Safety Notes

- Never commit `.env`.
- Do not use the placeholder `SECRET_KEY` or `POSTGRES_PASSWORD` values in production.
- If using HTTPS, keep `COOKIE_SECURE=true`.
- Do not expose Postgres publicly.
- Seeded demo accounts are for local/demo use. Change or remove demo credentials before real production use.
