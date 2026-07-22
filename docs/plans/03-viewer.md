# Nexkara Canvas — Implementation Plan 03: Prototype Viewer

> Rebuild of `Prototype Viewer.dc.html` — the collaborative canvas. Built to match
> the **rendered prototype** exactly (screens captured from the real DC prototype).
> Adds the realtime stack: **Yjs + y-websocket** (client) / **pycrdt-websocket** (server),
> plus **DOMPurify** + a **sandboxed iframe** for safe rendering.

---

## 1. Exact layout (from the rendered prototype)

**Topbar** (full-width, dark, 72px)
- Left: `nexkara` logo + divider + **Canvas** label.
- Right: **● N ONLINE** (green dot + count) · presence avatar stack · theme toggle ·
  **↑ Upload Version** (green button) · user chip (avatar + name + **ADMIN** role dot).

**Canvas sub-toolbar** (below topbar, ~40px)
- Left: **home** icon button (→ `/dashboard`).
- Center: project name + **version pill** (`v3`).
- Right: **device toggle** group (desktop / tablet / mobile) · **zoom** group (`−  Fit  +`) ·
  device-width label (`1320 px`) · **open-in-new-tab** · **fullscreen**.

**Canvas** (dotted-grid background)
- The prototype renders inside a **sandboxed `<iframe>`** (blob URL) centered on a white frame.
- **Live cursors** float over it (colored arrow + initials bubble per active user).
- Device widths: desktop **1320**, tablet **1032**, mobile **402**; landscape variants.
  Zoom steps `[.5,.67,.8,1,1.25,1.5]`; `Fit` = fit-to-width.

**Floating mode toolbar** (bottom-center pill)
- **Browse** (arrow, default) · **Comment** (bubble + count badge) · **Share** (share-nodes) · **Versions** (clock).

**Comment mode** → right **Comments sidebar** (only in comment mode)
- Header: **Comments** + `ON V3`. Tabs: **Active N** / **Resolved N**.
- Cards: avatar · author · timestamp (`2H AGO`) · version badge (`V3`) · resolve toggle ·
  body · **target chip** (`⟨⟩ Hero headline`) · **Reply…** input + send.
- Clicking the prototype in comment mode drops a **pin** at the click coords (zoom-independent,
  stored in unscaled stage coordinates) + a draft composer; a pin shows a reply-count badge.
- Clicking a pin opens a **popover** (author, resolve, body, replies thread, reply input).

**Versions drawer** (left slide-in, scrim)
- **Versions** + close. Cards newest-first: name · `vN · N comment(s)` · dot · **CURRENT** tag.
  Selecting one loads that version's HTML into the canvas.

**Share drawer** (right slide-in, scrim)
- **Share** + `ON V3`. **Invite people**: tag input (`Name or email…`, Enter to add) +
  message textarea + **Send invite**. **Or export**: **Download HTML**, **Copy share link**,
  **Save as PDF** (each an icon + title + subtitle row).

**Upload Version modal** — same shape as the dashboard upload, adds a new `vN`.

---

## 2. Tech mapping (new since Plan 02)

| Concern | Choice |
|---------|--------|
| Realtime presence + cursors + live comments | **Yjs** (client) ↔ **pycrdt-websocket** (server); one Y.Doc room per prototype |
| Presence/cursors transport | Yjs **awareness** (ephemeral) over the WS; who's-online + cursor xy/color/name |
| Comment/version sync | Persisted in Postgres **and** mirrored into the room's Y.Doc so all viewers update live |
| Safe rendering | **DOMPurify** sanitizes stored HTML → **sandboxed iframe** (`sandbox="allow-scripts"`, separate blob origin) |
| Presence fanout | Redis pub/sub backing the WS room (multi-replica) |

---

## 3. Data model (new)

**`comments`**
| id uuid · prototype_id fk · version int · author_id fk · left float · top float · target text ·
body text · resolved bool · created_at · updated_at |

**`comment_replies`**
| id uuid · comment_id fk · author_id fk · body text · created_at |

Pins store `left/top` in **unscaled stage coordinates** + a human `target` label. `prototype.comment_count`
is kept in sync. Versions already exist (`prototype_versions`); the Viewer reads `/content?v=`.

Alembic `0003_comments`.

---

## 4. Backend

**REST**
- `GET /prototypes/{id}/comments?version=` → threads (with replies, author).
- `POST /prototypes/{id}/comments` `{version,left,top,target,body}` (Casbin: commenter+).
- `POST /comments/{id}/replies` `{body}` · `POST /comments/{id}/resolve` `{resolved}`.
- `GET /prototypes/{id}/versions` → list (name, version, comment counts, current).
- `POST /prototypes/{id}/versions` (upload) — exists.
- `GET /prototypes/{id}/content?v=` → sanitized HTML (served/streamed for the iframe blob).

**WebSocket** `/ws/prototypes/{id}` (pycrdt-websocket)
- Auth via the session cookie; Casbin viewer+ to join.
- Y.Doc room per prototype: `awareness` carries `{userId,name,color,cursor:{x,y},version}`;
  a `comments` shared type mirrors new/resolved comments so open clients update without refetch.
- Redis pub/sub for cross-replica fanout.

Rendering safety: sanitize with a server pass too (bleach/nh3) as defense-in-depth; the iframe
is `sandbox`ed and served from a distinct path so it can't touch the app origin/cookies.

---

## 5. Frontend

**Route** `/p/[id]` (replaces the placeholder).
Zustand `useViewer`: mode (browse/comment), device, zoom, version, drawers (versions/share),
selectedPin, draft, presence[], cursors[], comments[].

**Components**
- `ViewerTopbar` (online count, presence, Upload Version, user chip)
- `CanvasToolbar` (home, name+version, device toggles, zoom, px, open-in-tab, fullscreen)
- `Canvas` (sandboxed iframe + blob URL + fit/zoom transform + dotted bg) + `CursorsLayer` + `PinsLayer`
- `ModeToolbar` (browse/comment/share/versions floating pill)
- `CommentsSidebar` (Active/Resolved tabs, `CommentCard`, reply)
- `PinPopover`, `DraftComposer`
- `VersionsDrawer`, `ShareDrawer` (invite + export: download/copy/print)
- `UploadVersionModal`
- Yjs client (`y-websocket`) → awareness for cursors/presence, observe `comments`.

**Cursor mechanic:** track pointer over the stage, throttle, write `{x,y}` (unscaled) to awareness;
render remote cursors from awareness at the effective scale. Pins are stored/derived in unscaled
stage coords so they survive zoom + device changes.

---

## 6. Follow-the-design checklist (exact)

- Bottom-center floating mode pill (not a left rail).
- Comments sidebar only in comment mode; `ON V3`; Active/Resolved counts; target chips `⟨⟩ …`.
- Versions drawer slides from the **left**; Share drawer from the **right**; both dimmed scrims.
- Export options are the three labeled rows: Download HTML / Copy share link / Save as PDF.
- Presence: `● N ONLINE` + overlapping avatars; live cursors are colored arrow + initials.
- Device widths 1320/1032/402 and the `Fit`/`±` zoom control with a `NNNN px` readout.

---

## 7. Task breakdown

**Backend**: `0003_comments` migration · comment/reply/resolve routes + schemas · versions list endpoint ·
sanitized content endpoint · pycrdt-websocket room (auth + awareness + comments type) + Redis fanout · tests.

**Frontend**: viewer route + store · topbar/sub-toolbar · sandboxed canvas (iframe blob, zoom/device/fit) ·
mode toolbar · comment placement + pins + popover + draft · comments sidebar · versions drawer · share/export drawer ·
upload-version modal · Yjs awareness cursors/presence · wire everything.

**Verify**: `docker compose up` (adds nothing new to infra beyond a WS route) · two browsers → live cursors +
live comments · place/resolve/reply comments persist · switch versions · export.

---

## 8. Definition of done

- `/p/{id}` renders the stored prototype in a sandboxed iframe with working zoom/device/fit/fullscreen.
- Placing a pin creates a persisted comment at stable coords; replies + resolve work; Active/Resolved filter.
- Two clients in the same prototype see **live cursors, presence, and new/resolved comments** in real time.
- Versions drawer switches the rendered version; Share drawer invites + exports (download/copy/print).
- Casbin: viewer can view; commenter can comment; editor+ can upload versions.
- Visual parity with the captured prototype screens; dark/light; backend tests green.
