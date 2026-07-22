# Nexkara Canvas

A collaborative prototype-review portal — upload live HTML prototypes, gather
pinned comments in context, track versions, and control access by role. This
repo is a production rebuild of the Claude Design prototype (`Canvas.dc.html`),
built screen by screen.

## Status

| Screen | Plan | State |
|--------|------|-------|
| **Auth** (login, 2FA, password reset) | [`docs/plans/01-auth.md`](docs/plans/01-auth.md) | ✅ implemented |
| Dashboard (projects, upload, sharing, settings) | _next_ | planned |
| Prototype Viewer (canvas, comments, presence) | _next_ | planned |

## Stack

- **Frontend** — Next.js 14 (App Router) · TypeScript · Tailwind + shadcn-style UI · Zustand
- **Backend** — FastAPI · SQLAlchemy 2.0 (async) · Alembic · Pydantic v2
- **Auth/Security** — Argon2id (argon2-cffi) · JWT in httpOnly cookies (pyjwt/Authlib) · Casbin RBAC · slowapi rate limiting
- **Data** — PostgreSQL 16 · Redis 7 (OTP, cooldowns, rate limits)
- **Infra** — Docker Compose · Caddy reverse proxy

> Yjs/pycrdt (realtime), MinIO (object storage) and DOMPurify (HTML sanitizing)
> arrive with the Viewer/Upload screens that need them.

## Run it

```bash
cp .env.example .env         # tweak secrets for anything non-local
docker compose up --build
```

Then open **http://localhost** (Caddy). The API is proxied under `/api`.

On first boot the API runs migrations and seeds the demo admin from `.env`:

- **Email:** `alex.rivera@nexkara.com`
- **Password:** `Password123!`

Sign in → a 6-digit code is emailed. In dev the mail backend is `console`, so
the code is printed in the API logs:

```bash
docker compose logs -f api      # look for "[DEV EMAIL] ..."
```

## Develop locally (without Docker)

**Backend**
```bash
cd backend
uv venv && source .venv/bin/activate
uv pip install -e ".[dev]"
pytest                          # auth flow tests (sqlite + fakeredis, no services needed)
uvicorn app.main:app --reload   # needs Postgres + Redis running
```

**Frontend**
```bash
cd frontend
npm install
npm run dev                     # http://localhost:3000, proxies /api -> localhost:8000
```

## Auth model (summary)

- Password + email 6-digit OTP 2FA. Codes are hashed in Redis with a TTL,
  attempt limit, and 30s resend cooldown.
- Sessions and the 30-day "trusted device" token are signed JWTs in httpOnly
  cookies — no secrets in the browser's JS reach.
- All client-side validation (email, code, password rules) is re-enforced
  server-side. `/auth/*` is rate-limited; login/forgot never reveal whether an
  account exists.

See [`docs/plans/01-auth.md`](docs/plans/01-auth.md) for the full design.
