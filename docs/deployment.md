# Deploying Nexkara Canvas

Production guide for the full stack (Next.js + FastAPI + Postgres + Redis +
object storage + Caddy). The app is built for **PostgreSQL 16**; SQLite is only
used for local tests.

---

## 1. Quickest path — one host with Docker

```bash
git clone <repo> && cd nexkara_canvas
cp .env.example .env
# edit .env (see §3), then:
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Point DNS `APP_DOMAIN` and `SANDBOX_DOMAIN` (A/AAAA records) at the host.
Caddy provisions HTTPS automatically. This runs Postgres/Redis/MinIO as
containers — fine for a single box; use managed services (§2) for real scale.

---

## 2. Recommended production topology

| Component | Recommendation |
|-----------|----------------|
| **Database** | Managed **PostgreSQL 16** — AWS RDS/Aurora, GCP Cloud SQL, or Neon/Supabase. Enable automated backups + PITR. |
| **Connection pooling** | Add **PgBouncer** (or provider pooler) once you run 2+ API replicas. |
| **Redis** | Managed **Redis 7** — ElastiCache / Upstash / Redis Cloud. Required for realtime presence fan-out across replicas. |
| **Object storage** | Real **S3** (or R2 / managed MinIO). Set `STORAGE_BACKEND=minio` and the S3 creds. |
| **API** | 2+ replicas behind the LB. Presence/cursors already fan out via Redis pub/sub, so any replica can serve any WebSocket. |
| **TLS / proxy** | Caddy (bundled) or your cloud LB. WebSocket upgrade on `/api/ws/*` must be allowed. |
| **Secrets** | A secrets manager (AWS Secrets Manager / SSM / Doppler), injected as env — not committed `.env`. |

To use managed data services, just point the env at them and don't start the
bundled containers (e.g. `docker compose ... up -d api web caddy`).

---

## 3. Environment configuration

Generate a strong secret: `openssl rand -hex 32`.

Required for production (`ENV=production` — the API **refuses to boot** if these are unsafe):

```bash
ENV=production
JWT_SECRET=<64-hex-chars>            # NOT the dev default; >=32 chars
COOKIE_SECURE=true                   # cookies only over HTTPS
SEED_ADMIN_PASSWORD=<strong>         # not admin123 / Password123!
FRONTEND_ORIGIN=https://canvas.example.com

# Database (managed)
POSTGRES_HOST=... POSTGRES_PORT=5432 POSTGRES_USER=... POSTGRES_PASSWORD=... POSTGRES_DB=...
#   or a full DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db

# Redis (managed) — also backs presence fan-out
REDIS_URL=rediss://:password@host:6379/0

# Object storage
STORAGE_BACKEND=minio
MINIO_ENDPOINT=s3.amazonaws.com MINIO_ACCESS_KEY=... MINIO_SECRET_KEY=... MINIO_BUCKET=... MINIO_SECURE=true

# Domains
APP_DOMAIN=canvas.example.com
SANDBOX_DOMAIN=sandbox.canvas.example.com
SANDBOX_ORIGIN=https://sandbox.canvas.example.com   # see §5
```

---

## 4. Database migrations

Alembic runs on API startup (the compose `api` command does
`alembic upgrade head`). For zero-downtime deploys, run migrations as a
separate step before rolling API replicas:

```bash
docker compose run --rm api alembic upgrade head
```

---

## 5. The prototype sandbox (isolation)

Uploaded HTML is untrusted. In production it is served from a **separate
origin** (`SANDBOX_DOMAIN`) so its scripts can't reach the app's origin,
cookies, or DOM:

- The app mints a short-lived **signed token** per prototype+version and points
  the viewer's iframe at `https://sandbox.../s/{id}?v=..&t=..`.
- The sandbox host (`Caddyfile.prod`) serves **only `/s/*`** and 404s everything
  else, so no authenticated API is reachable there.
- Responses set `Content-Security-Policy: frame-ancestors <APP_DOMAIN>` so only
  the app can frame them.

Leave `SANDBOX_ORIGIN` empty in dev — the viewer falls back to a same-origin
blob (which enables element-targeted comments and cursor-over-iframe tracking).
The isolation trade-off: cross-origin sandboxing disables reading the prototype
DOM, so those two conveniences are off in prod (comments still pin by coordinate).

---

## 6. Scaling realtime

Live presence, cursors, and comment events fan out through **Redis pub/sub**
(`app/ws/rooms.py`), with presence stored in a Redis hash. This means:

- Any number of API replicas can serve WebSockets; a viewer connected to
  replica A sees cursors from a viewer on replica B.
- No sticky sessions required. Just ensure every API replica shares the same
  `REDIS_URL`.

---

## 7. Security checklist

- [ ] `ENV=production`, strong `JWT_SECRET`, `COOKIE_SECURE=true`
- [ ] Strong seeded admin password; rotate/disable after first real users exist
- [ ] Managed Postgres with automated backups + PITR
- [ ] `SANDBOX_ORIGIN` set to an isolated subdomain serving only `/s/*`
- [ ] Redis reachable only from the app network (or TLS + auth if managed)
- [ ] Object storage bucket private; app uses scoped credentials
- [ ] Secrets from a manager, not committed
- [ ] HTTPS everywhere (Caddy auto-TLS or LB), WebSocket upgrade allowed on `/api/ws/*`
- [ ] Rate limits (slowapi) tuned for your traffic

---

## 8. Health & operations

- Health check: `GET /api/health` → `{"status":"ok"}`.
- Dev OTP/email prints to the API logs (`MAIL_BACKEND=console`); set real SMTP
  (`MAIL_BACKEND=smtp` + `SMTP_*`) in production.
- Logs: `docker compose logs -f api web caddy`.
