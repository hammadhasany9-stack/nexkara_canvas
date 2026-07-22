# Nexkara Canvas — Implementation Plan 01: Auth Screen

> Rebuild of `Canvas.dc.html` → `Auth.dc.html` as a production app.
> This is the **first screen** in a screen-by-screen build. It also stands up the
> shared foundation (monorepo, docker-compose, Postgres, Redis, base FastAPI +
> Next.js) that every later screen reuses.

---

## 1. What the Auth screen is

A single auth card (right) beside a marketing cover panel (left). One client state
machine drives **5 views** off a `step` variable — no sign-up and no OAuth/SSO in the
prototype. Onward navigation is signaled by `window.__canvasNav.authed()`, which in the
real app becomes "set session cookie + redirect to `/dashboard`".

| View | Purpose | Key fields | Success transition |
|------|---------|-----------|--------------------|
| `login` | Sign in | work email, password (show/hide) | trusted device → `authed()`; else → `twofa` |
| `twofa` | 2FA after login | 6-digit OTP, "Trust this device 30 days" (default on) | `authed()` |
| `forgot` | Start reset | work email | → `forgotcode` |
| `forgotcode` | Verify reset code | 6-digit OTP | → `reset` |
| `reset` | Set new password | new + confirm password, live rules checklist | → `login` (with success banner) |

**Prototype shortcuts to replace with real backend:**
- Hardcoded OTP `204815` → server-issued OTP, hashed in Redis with TTL.
- `localStorage["lp-2fa-trust"]` timestamp → signed, httpOnly "trusted device" cookie.
- `window.__canvasNav.authed()` → JWT session cookie + redirect.

**Validation (port verbatim):**
- Email regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` → "Enter a valid work email address."
- Empty password → "Enter your password to continue."
- OTP must be 6 digits; wrong code → shake + "That code isn't right. Check and try again."
- Password rules (checklist, not a meter): ≥8 chars · upper+lower · a number · a symbol.
  Mismatch → "Passwords don't match."
- Resend cooldown: 30s countdown, label `Resend code in 0:SS`.

**Branding / UX to preserve:**
- Product **Nexkara**, module **Canvas**. Cover eyebrow "Prototype collaboration".
- Cover H1 "Every prototype, reviewed in one trusted space." + subtitle + 3 feature bullets.
- Cover hidden below 900px (card-only on mobile).
- Full light/dark theme; persisted to `localStorage["lp-theme"]`; `prefers-reduced-motion` respected.
- Teal/green brand (`--brand-600 #00896b`, dark `#12a986`) on deep-navy dark surfaces
  (`#0d1520` / `#152032`).

---

## 2. Tech mapping (from the requested stack)

| Concern | Choice |
|---------|--------|
| UI | Next.js 14+ App Router, TypeScript, Tailwind + shadcn/ui (rounded/friendly) |
| Auth UI state | Zustand store (`useAuthFlow`: step, email, errors, resend timer, theme) |
| API | FastAPI + Uvicorn (async) |
| DB | PostgreSQL 16 via SQLAlchemy 2.0 async + Alembic |
| Validation | Pydantic v2 schemas |
| Passwords | argon2-cffi (Argon2id) |
| Sessions/JWT | pyjwt + Authlib, tokens in **httpOnly, Secure, SameSite=Lax** cookies |
| OTP + trust + rate state | Redis 7 (hashed OTP, resend cooldown, attempt counters) |
| Rate limiting | slowapi on `/auth/*` |
| RBAC | Casbin — seed roles now, enforce on later screens |
| Proxy/HTTPS | Caddy (dev + prod), reverse proxy to web + api |
| Orchestration | Docker + docker-compose (one command up) |

Yjs/pycrdt/MinIO are **not** needed for Auth — deferred to the Viewer/Upload screens.

---

## 3. Foundation stood up with this screen (reused later)

```
nexkara_canvas/
├─ docker-compose.yml         # postgres, redis, api, web, caddy (minio added later)
├─ Caddyfile                  # reverse proxy: web :3000, api :8000
├─ .env.example
├─ backend/
│  ├─ pyproject.toml
│  ├─ alembic/                # migrations
│  ├─ app/
│  │  ├─ main.py              # FastAPI app, CORS, slowapi, routers
│  │  ├─ core/               # config (pydantic-settings), security, redis, casbin
│  │  ├─ db/                 # async engine, session, base
│  │  ├─ models/            # SQLAlchemy models
│  │  ├─ schemas/           # Pydantic v2
│  │  ├─ services/          # auth_service, otp_service, mail_service
│  │  └─ api/routes/        # auth.py
│  └─ tests/
└─ frontend/
   ├─ package.json
   ├─ app/
   │  ├─ (auth)/login/page.tsx
   │  ├─ layout.tsx          # theme provider, fonts
   │  └─ globals.css         # design tokens (light/dark)
   ├─ components/auth/        # AuthCard, CoverPanel, CodeInput, PasswordRules, etc.
   ├─ components/ui/          # shadcn primitives
   ├─ lib/                    # api client, cookies
   └─ store/useAuthFlow.ts    # Zustand
```

---

## 4. Data model (Auth slice)

**`users`** (Postgres)
| column | type | notes |
|--------|------|-------|
| id | uuid pk | |
| email | citext unique | work email |
| password_hash | text | Argon2id |
| display_name | text | e.g. "Alex Rivera" |
| org_role | enum(`admin`,`member`) | drives Casbin; seed user = admin |
| is_active | bool | |
| created_at / updated_at | timestamptz | |

**Redis keys (ephemeral):**
- `otp:{purpose}:{user_id}` → `{hash, attempts}`, TTL 10m. purpose ∈ `login2fa` | `pwreset`.
- `otp_cooldown:{purpose}:{user_id}` → TTL 30s (drives resend timer).
- `rate:{ip}:{route}` → slowapi counters.

**Trusted device:** signed cookie `nx_trust` (httpOnly, 30d) = JWT `{sub, purpose:"device_trust", exp}`.
On login, if valid → skip 2FA. Server-side truth, not localStorage.

Alembic migration `0001_users` creates `users` (+ `citext` extension) and seeds the demo
admin `alex.rivera@nexkara.com` (env-configurable) so the prototype's prefilled login works.

---

## 5. Backend endpoints

All under `/api/auth`, JSON, Pydantic-validated, slowapi-limited. Cookies set server-side.

| Method | Path | Body | Behavior |
|--------|------|------|----------|
| POST | `/login` | email, password | Verify Argon2id. On success: if `nx_trust` cookie valid → issue session cookie, return `{status:"authenticated"}`. Else generate OTP → Redis, email it, return `{status:"2fa_required", masked_email}`. Generic error on bad creds (no user-enumeration). Limit 5/min/IP. |
| POST | `/2fa/verify` | code, trust_device | Check OTP hash + attempts (max 5). On success: if `trust_device` set `nx_trust` cookie; issue session cookie; return user. Wrong → 400 + remaining attempts. |
| POST | `/2fa/resend` | — | Honor `otp_cooldown`; regenerate + email; reset 30s cooldown. |
| POST | `/password/forgot` | email | Always 200 (`masked_email` if exists) to avoid enumeration; if exists, OTP → Redis + email. |
| POST | `/password/verify-code` | email, code | Validate reset OTP; return short-lived `reset_token` (JWT, 10m) rather than advancing blindly. |
| POST | `/password/reset` | reset_token, new_password | Verify token, enforce password rules server-side, Argon2id hash, update user, invalidate OTP + sessions. |
| POST | `/logout` | — | Clear session cookie (used by later screens). |
| GET | `/me` | — | Return current user from session cookie (guards `/dashboard`). |

**Security specifics:**
- Session JWT: `{sub, org_role, exp}` (short, e.g. 60m) in `nx_session` httpOnly cookie;
  Argon2id params tuned (time≥3, mem≈64MB). Constant-time compares. OTP is 6 digits,
  stored only as a hash. Password rules validated **server-side** too (never trust client).
- slowapi limits per route; wrong-OTP attempt counter locks the code after 5 tries.
- Dev OTP delivery: log to console / MailHog. Prod: real SMTP via `mail_service`.

---

## 6. Frontend build

**Routes:** `/login` renders the whole flow (single page, step-switched — mirrors the
prototype). Middleware redirects `/login → /dashboard` when `nx_session` is present, and
protected routes → `/login` when absent.

**Zustand `useAuthFlow`:** `step`, `email`, `maskedEmail`, `code[6]`, `resendIn`,
`errors`, `theme`, plus actions (`submitLogin`, `verifyCode`, `resend`, `sendForgot`,
`verifyResetCode`, `savePassword`, `toggleTheme`). API calls via `lib/api` (fetch with
`credentials:"include"`).

**Components (shadcn/ui, rounded):**
- `CoverPanel` — logo, eyebrow, H1, subtitle, 3 feature bullets; hidden < 900px.
- `AuthCard` — shell + heading/sub per step.
- `LoginForm`, `TwoFactorForm` (+ "Trust this device" checkbox), `ForgotForm`,
  `CodeInput` (6 auto-advancing cells: paste-distribute, backspace-to-prev, digits only,
  shake on error), `ResetForm` + `PasswordRules` (live ok/not-ok checklist), `ResendRow`
  (30s countdown), `ThemeToggle` (sun/moon, persists `lp-theme`, sets `html.dark`).
- Error banners + success banner ("Password updated. Sign in with your new password.").

**Theme:** port the token sets into `globals.css` as CSS variables under `:root` /
`html.dark`; brand teal + navy dark surfaces. Theme class applied pre-hydration via a tiny
inline script to avoid flash; respect `prefers-reduced-motion`.

---

## 7. Decisions I'm defaulting on (flag if you disagree)

1. **No sign-up / no SSO** — matches the prototype. Users are seeded/invited (invite UI
   lives in the Dashboard's Settings→Users, a later screen). Auth is email+password+OTP.
   Endpoints are structured OAuth-ready (Authlib) for later.
2. **Real OTP over email**, dev delivery via console/MailHog (no hardcoded `204815`).
3. **"Remember me"** — prototype scaffolds it in state but never renders it. I'll **omit**
   the control; session lifetime is handled by the cookie. (Say the word to surface it.)
4. **Trusted device** = signed httpOnly cookie (30d), server-verified — replaces localStorage.
5. **Casbin** roles are seeded now (`admin`/`member`) but enforcement lands with screens
   that need it (Dashboard/Viewer). Auth only needs org_role in the session token.

---

## 8. Task breakdown (Auth)

**Foundation**
1. Monorepo scaffold + `docker-compose.yml` (postgres, redis, api, web, caddy) + `Caddyfile` + `.env.example`.
2. FastAPI app skeleton: config, async SQLAlchemy engine/session, Redis client, slowapi, CORS, health check.
3. Alembic init + `0001_users` migration + seed admin.

**Backend auth**
4. `core/security.py`: Argon2id hash/verify, JWT issue/verify, cookie helpers.
5. `otp_service` (Redis: generate/hash/verify/cooldown/attempts) + `mail_service` (console/SMTP).
6. Routes: `/login`, `/2fa/verify`, `/2fa/resend`, `/password/forgot`, `/password/verify-code`, `/password/reset`, `/logout`, `/me` + Pydantic schemas + slowapi limits.
7. Pytest: login (trusted/untrusted), 2FA success/wrong/lockout, full reset flow, rate-limit, enumeration-safety.

**Frontend**
8. Next.js + Tailwind + shadcn init; design tokens + fonts; theme provider (no-flash + persist).
9. Zustand `useAuthFlow` + `lib/api` client.
10. Cover panel + auth card + all 5 step forms + `CodeInput` + `PasswordRules` + `ResendRow` + `ThemeToggle`.
11. Middleware route guards (`/login` ↔ `/dashboard` via `/me`).
12. Wire forms to endpoints; port all validation strings; success/error banners.

**Verify**
13. `docker compose up` → full manual pass of every flow through Caddy; responsive check < 900px; dark/light.

---

## 9. Definition of done

- `docker compose up` serves the login flow behind Caddy (HTTPS in prod, http in dev).
- All 5 views work end-to-end against the real backend; OTP via email (console in dev).
- Passwords Argon2id-hashed; sessions + device-trust in httpOnly cookies; `/auth/*` rate-limited.
- Server-side validation mirrors the client; no user-enumeration on login/forgot.
- Light/dark parity with the prototype; `< 900px` shows card only; reduced-motion honored.
- Backend tests green.

---

*Next screens (separate plans): 02 Dashboard (projects, upload, share, settings/users,
notifications, trash — adds MinIO + Casbin enforcement), 03 Prototype Viewer (sandboxed
iframe canvas, pinned comments, versions, presence — adds Yjs + pycrdt-websocket).*
