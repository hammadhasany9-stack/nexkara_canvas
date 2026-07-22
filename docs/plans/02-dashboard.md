# Nexkara Canvas — Implementation Plan 02: Dashboard

> Rebuild of `Dashboard.dc.html` on the stack established in Plan 01.
> Adds the first **object storage** (MinIO) and turns on **Casbin enforcement**.

---

## 1. What the Dashboard is

The signed-in home: a topbar + left sidebar + a searchable grid/list of prototype
cards, plus modals for upload, share, rename, settings (profile/password/users),
notifications, and a trash lifecycle. All prototype data in the prototype was
client-side `localStorage`; here it becomes real DB rows + files in MinIO.

**Regions**
- **Topbar** — logo · presence avatars · theme toggle · notifications bell (unread badge) · profile button.
- **Sidebar** — nav: Home / Recents / Shared with me / Trash (live counts) · bottom: Notifications, Settings, Log out.
- **Main** — hero (title + "N prototypes · N collaborators") · toolbar (search, grid/list toggle, Upload) · card grid/list or empty state.

**Prototype card** — thumbnail + type badge (WEB/APP), name, version (`v1`), comment
count, "edited" relative time, team, collaborator avatars, and hover actions
(Open / Rename / Share / Trash·Restore·Delete).

**Flows**
- **Upload** — drop/select a single `.html`/`.htm`; name (required); layout chips
  (desktop/tablet/mobile, multi); type chip (Web/App). On submit → create prototype
  + store the HTML → open Share modal → navigate to the Viewer (`/p/<id>`).
- **Share** — add collaborators (people search → chips), copyable share link, finish.
- **Settings** — tabs: Profile (read-only), Password (change + live rules), Users
  (list, add user with role + generated password, resend invite, permission legend).
- **Notifications** — list of activity, "Mark all read".
- **Rename** — name + layouts. **Trash** — soft-delete → restore or permanent delete (confirm dialog).

**Bridges in the prototype → real routing**
- `window.__canvasNav.open(payload)` + `sessionStorage["lp-pending-upload"]` → `router.push("/p/<id>")`.
- `window.__canvasNav.signout()` → `POST /auth/logout` → `/login`.
- `sessionStorage["lp-open-settings"]` → open Settings modal on load (query param `?settings=1`).

---

## 2. Tech mapping (new since Plan 01)

| Concern | Choice |
|---------|--------|
| Uploaded HTML storage | **MinIO** (S3 API) via the `minio` Python SDK; presigned GETs for the Viewer |
| Access control | **Casbin** now enforced: org role (`admin`/`member`) + per-prototype access level |
| Uploads | FastAPI `UploadFile` (multipart), size + MIME + extension checks |
| Lists/search | SQLAlchemy queries with filters; server-side search + section filter |
| Frontend data | SWR-style fetching via `lib/api`; **Zustand** for dashboard UI state (modals, selection, search) |

**Still deferred:** DOMPurify + sandboxed-iframe *rendering* stays in the Viewer (Plan 03) —
the Dashboard only shows **placeholder thumbnails**, so it never renders untrusted HTML.
Yjs/pycrdt also remain Viewer-only.

---

## 3. Data model (new tables)

**`prototypes`**
| column | type | notes |
|--------|------|-------|
| id | uuid pk | |
| owner_id | uuid fk→users | |
| name | text | |
| type | enum(`web`,`app`) | |
| team | text | default "Product" |
| layouts | jsonb / text[] | subset of desktop/tablet/mobile |
| current_version | int | starts 1 |
| comment_count | int | denormalized for cards (0 for now) |
| trashed_at | timestamptz null | soft delete |
| created_at / updated_at | timestamptz | |

**`prototype_versions`**
| id | uuid pk · prototype_id fk · version int · storage_key text (MinIO object) · byte_size int · created_by fk · created_at |

**`prototype_members`** (per-prototype sharing)
| prototype_id fk · user_id fk · access enum(`viewer`,`commenter`,`editor`,`manager`) · added_at · **pk(prototype_id,user_id)** |

**`notifications`**
| id · user_id fk (recipient) · actor_id fk · verb text · target_type · target_id · read_at null · created_at |

**Sections** (Home/Recents/Shared/Trash/Drafts) are **derived**, not stored:
- Home = owned + not trashed; Recents = ordered by `updated_at`; Shared = via `prototype_members`;
  Trash = `trashed_at is not null`; Drafts = owned with no shares yet.

Alembic `0002_dashboard` adds these tables. `users` gets an optional `invited_at` /
`invite_status` for the Users tab's "resend invite".

---

## 4. Backend endpoints (new router `/api`)

**Prototypes**
| Method | Path | Notes |
|--------|------|-------|
| GET | `/prototypes?section=&q=` | list for current user, filtered + searched |
| POST | `/prototypes` (multipart) | file + name + type + layouts → create + v1 in MinIO |
| GET | `/prototypes/{id}` | metadata (Casbin: viewer+) |
| PATCH | `/prototypes/{id}` | rename / layouts (Casbin: editor+) |
| POST | `/prototypes/{id}/versions` (multipart) | upload new version |
| GET | `/prototypes/{id}/content?v=` | presigned URL / stream (Viewer uses this) |
| POST | `/prototypes/{id}/trash` · `/restore` | soft-delete toggle |
| DELETE | `/prototypes/{id}` | permanent (owner/admin) |

**Sharing**
| GET | `/prototypes/{id}/members` · POST add `{user_id, access}` · DELETE `/members/{user_id}` |
| POST | `/prototypes/{id}/share-link` | returns a signed link token |

**Users (admin)** — `GET /users`, `POST /users` (name/email/role/password), `POST /users/{id}/resend-invite`, `DELETE /users/{id}`
**Account** — `PATCH /account/profile`, `POST /account/password` (current+new, reuses Plan 01 rules)
**Notifications** — `GET /notifications`, `POST /notifications/read-all`
**Presence** — `GET /presence` (recent collaborators; simple now, Redis-backed later)

All mutations run a **Casbin check**; `403` on failure. Uploads validated:
extension ∈ {.html,.htm}, `Content-Type` text/html, max size (e.g. 5 MB).

---

## 5. Frontend

**Route** `/dashboard` (server-guarded by middleware; data via client fetches).
Modals as client components driven by a `useDashboard` Zustand store
(`view`, `section`, `query`, open-modal flags, selection).

**Components**
- `Topbar` (Logo, PresenceStack, ThemeToggle, NotificationsBell, ProfileButton)
- `Sidebar` (nav items w/ live counts, Settings, LogoutButton)
- `Toolbar` (SearchInput, GridListToggle, UploadButton)
- `PrototypeCard` / `PrototypeRow` (thumbnail placeholder, type badge, meta, avatar stack, hover actions)
- `EmptyState`
- Modals: `UploadModal` (dropzone + name + layout/type chips), `ShareModal`
  (people search + chips + copy link), `SettingsModal` (Profile/Password/Users tabs +
  `AddUserModal`), `NotificationsPanel`, `RenameModal`, `ConfirmDialog`
- Reused from Plan 01: `Button`, `Input`, `Label`, `Banner`, `PasswordRules`, `ThemeToggle`, `Logo`

**Thumbnails:** deterministic **abstract-art placeholder** keyed by a hue derived from
the prototype id (mirrors the prototype's default). Real rendered thumbnails are a later
enhancement (headless capture), noted below.

---

## 6. Decisions to confirm (defaults in **bold**)

1. **Thumbnails = placeholder art now.** Live/rendered previews come with the Viewer's
   sandbox in Plan 03. Avoids rendering untrusted HTML on the dashboard. *(Alt: headless-Chromium PNG capture — heavier infra.)*
2. **Build the full Users/RBAC tab now.** It's core to the "role-based access" pitch and
   the data model needs it. *(Alt: stub Users read-only, defer add/invite.)*
3. **Invites create a user with a generated password** (admin-set), shown once — matches
   the prototype's "Generate password". No email-invite delivery yet (console note). *(Alt: emailed invite link.)*
4. **Share link** = signed, expiring token to `/p/<id>` (real link sharing lands fully with the Viewer).
5. **Comment counts show 0** until the Viewer (Plan 03) creates comments.

---

## 7. Task breakdown

**Backend**
1. `0002_dashboard` migration (prototypes, versions, members, notifications; users invite fields).
2. MinIO service (`storage_service`: put/get/presign) + compose service + env.
3. Casbin: extend model/policy for per-prototype access; `require(access)` dependency.
4. Prototype routes (CRUD, upload, versions, content, trash/restore/delete) + schemas.
5. Sharing routes (members, share-link).
6. Users-admin + account routes; Notifications routes.
7. Pytest: upload→list→get→rename→share→trash→restore→delete; RBAC denials; search/section filters.

**Frontend**
8. `useDashboard` store + data hooks.
9. Topbar + Sidebar + Toolbar + hero.
10. Card/Row grid+list, search, section filtering, empty state.
11. UploadModal (dropzone, validation) → create → ShareModal → route to `/p/<id>`.
12. SettingsModal (Profile/Password/Users + AddUser), NotificationsPanel, RenameModal, ConfirmDialog.
13. Wire `?settings=1` deep-link; logout; presence stack.

**Infra + verify**
14. Add `minio` service to docker-compose (+ console), bucket bootstrap.
15. `docker compose up` smoke test: upload a real `.html`, see it on a card, share, trash/restore; RBAC by role.

---

## 8. Definition of done

- Upload a `.html` → it persists to MinIO + DB and appears as a card; reload keeps it.
- Search, section filters, grid/list, rename, trash→restore→delete all work against the API.
- Sharing adds collaborators; Shared-with-me reflects it for the other user.
- Settings: change password, and (admin) add/list users with roles; non-admins are denied.
- Casbin blocks unauthorized actions (`403`); everything is owner/role-scoped.
- Dark/light parity; responsive; backend tests green.
- `Open` on a card routes to `/p/<id>` (Viewer placeholder until Plan 03).

---

*Plan 03 (Prototype Viewer) then adds the sandboxed-iframe canvas, pinned comments,
versions UI, live presence/cursors (Yjs + pycrdt-websocket), and DOMPurify sanitizing.*
