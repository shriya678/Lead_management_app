# Data model

Mongoose schemas, indexes, and how the entities relate.

---

## Entities at a glance

```
User ────────< Lead >──────── Note
                │
                └──────────── Activity
```

- **User** — an admin or member (login + role)
- **Lead** — a potential customer; created by public form, worked by team
- **Note** — a timestamped comment on a lead
- **Activity** — auto-generated audit entry

---

## User

| Field | Type | Rules | Rationale |
|---|---|---|---|
| `_id` | ObjectId | primary key | — |
| `name` | String | required, trimmed, ≤ 100 chars | Display in UI |
| `email` | String | required, unique, lowercased, indexed, regex-validated | Login identifier |
| `passwordHash` | String | required, `select: false` | Never returned by default; controllers opt in with `.select('+passwordHash')` |
| `role` | String | enum `['admin', 'member']`, default `'member'`, required | Drives permission checks |
| `createdAt`, `updatedAt` | Date | auto (`timestamps: true`) | Audit |

**Methods:** `user.toPublicJSON()` returns `{ id, name, email, role, createdAt }` — the shape the API sends outward. Never leaks `passwordHash`.

**Indexes:** implicit unique index on `email`.

---

## Lead

| Field | Type | Rules | Rationale |
|---|---|---|---|
| `_id` | ObjectId | primary key | — |
| `name` | String | required, trimmed, ≤ 100 chars | Display + search |
| `email` | String | required, lowercased, indexed, regex-validated | Contact + search |
| `phone` | String | optional, trimmed | Optional contact channel |
| `company` | String | optional, trimmed | Metadata |
| `source` | Enum | `website` / `referral` / `ad` / `other`, default `website` | Where the lead came from |
| `status` | Enum | `new` / `contacted` / `qualified` / `won` / `lost`, default `new` | Sales pipeline stage |
| `assignedTo` | ObjectId ref User | nullable, indexed | Team-member ownership |
| `createdAt`, `updatedAt` | Date | auto | Sort + audit |

**`toJSON` transform:** renames `_id → id`, strips `__v`. Client always sees `{ id, name, ... }`.

**Indexes:**
- `email` — for the search filter (regex on name OR email)
- `{ assignedTo: 1, status: 1 }` compound — hot query for member-filtered-by-status; also serves the assignedTo-only query
- `createdAt: -1` — default sort in `GET /leads`

**Deletion:** hard delete. `DELETE /api/leads/:id` explicitly cascade-deletes `Note.deleteMany({leadId})` + `Activity.deleteMany({leadId})` before removing the lead. See [`decisions.md`](decisions.md) entry on cascade strategy.

---

## Note

| Field | Type | Rules | Rationale |
|---|---|---|---|
| `_id` | ObjectId | primary key | — |
| `leadId` | ObjectId ref Lead | required, indexed | Notes always belong to a lead |
| `authorId` | ObjectId ref User | required | Who wrote it |
| `body` | String | required, trimmed, ≤ 5000 chars | The note content |
| `createdAt` | Date | auto (`timestamps: { createdAt: true, updatedAt: false }`) | Notes are immutable — no `updatedAt` |

**Indexes:** `{ leadId: 1, createdAt: -1 }` — matches the hot query "notes for this lead, newest first".

**Immutable by design** — no PATCH or DELETE endpoint. Preserves audit-trail credibility. Grace-window editing is a documented next step.

---

## Activity

| Field | Type | Rules | Rationale |
|---|---|---|---|
| `_id` | ObjectId | primary key | — |
| `leadId` | ObjectId ref Lead | required, indexed | Activities always belong to a lead |
| `actorId` | ObjectId ref User | nullable | Null for public capture (nobody logged in) |
| `type` | Enum | `created` / `status_changed` / `assigned` / `note_added` / `updated` | What happened |
| `meta` | Mixed | freeform per convention below | Type-specific detail |
| `createdAt` | Date | auto | Timeline order |

**Indexes:** `{ leadId: 1, createdAt: -1 }` — same reason as Note.

### `meta` shape convention per type

Documented at the top of [`Activity.js`](../server/src/models/Activity.js). Freeform `Mixed` on purpose — new activity types cost zero migration.

| type | meta shape |
|---|---|
| `created` | `{ source }` (from `Lead.source` at creation) |
| `status_changed` | `{ from, to }` (status enum values) |
| `assigned` | `{ from, to }` (userId strings or null) |
| `note_added` | `{ noteId, preview }` (`preview = body.slice(0, 80)`) |
| `updated` | `{ fields: [...] }` (non-status non-assign field names changed) |

---

## Entity relationships

```
User (1) ────────< (N) Lead        Lead.assignedTo (nullable)
Lead (1) ────────< (N) Note        Note.leadId
Lead (1) ────────< (N) Activity    Activity.leadId
User (1) ────────< (N) Note        Note.authorId
User (0..1) ─────< (N) Activity    Activity.actorId (nullable — public capture)
```

All refs use Mongoose `.populate()` in the API layer to hydrate names/emails where useful (e.g. `Lead.assignedTo` populates to `{ _id, name, email }` for the UI).

---

## JWT payload shapes

Two separately-signed tokens per session — a short-lived **access** token attached
to every request, and a longer-lived **refresh** token used only to obtain a fresh
access when the current one expires. Different secrets so a leaked access token
can't be forged into a refresh (and vice-versa).

### Access token — `utils/jwt.signAccessToken(user)`

```json
{
  "sub":  "<user._id>",
  "role": "admin | member",
  "name": "<user.name>",
  "type": "access",
  "iat":  <issued at, unix seconds>,
  "exp":  <iat + 15 min>
}
```

Signed HS256 with `JWT_SECRET`. Client attaches to every request as
`Authorization: Bearer <accessToken>`.

### Refresh token — `utils/jwt.signRefreshToken(user)`

```json
{
  "sub":  "<user._id>",
  "type": "refresh",
  "iat":  <issued at, unix seconds>,
  "exp":  <iat + 7 days>
}
```

Signed HS256 with `JWT_REFRESH_SECRET` (a *different* secret). Minimal payload —
role and name are re-read from the DB at refresh time, so a mid-session role
change takes effect on the next refresh.

### Refresh flow

```
Client                                         Server
  │
  │  request with expired accessToken
  │──────────────────────────────────────────►
  │                                             401 Unauthorized (Token expired)
  │◄──────────────────────────────────────────
  │
  │  POST /api/auth/refresh
  │  { refreshToken }
  │──────────────────────────────────────────►
  │                                             verify sig (JWT_REFRESH_SECRET)
  │                                             confirm payload.type === 'refresh'
  │                                             User.findById(payload.sub)
  │                                             signAccessToken(user)
  │                                             200 { accessToken }
  │◄──────────────────────────────────────────
  │
  │  retry original request with new accessToken
  │──────────────────────────────────────────►
  │                                             200 (or whatever the original returned)
  │◄──────────────────────────────────────────
```

Whole flow is transparent to the user — the Axios response interceptor on the
client handles it and retries the original request. Only if `/auth/refresh`
itself returns 401 (refresh token expired or invalid) is the user hard-
navigated to `/login`.

**Design choice:** stateless (no DB storage of refresh tokens). Simpler; refresh
is a signature check, no DB write on login, no DB lookup for the token itself
(just for the user). Trade-off: cannot revoke an individual leaked refresh
before it expires. Production upgrade documented in [`decisions.md`](decisions.md#5).

---

## Naming conventions

- **Model names:** singular PascalCase — `User`, `Lead`, `Note`, `Activity`
- **Collection names:** Mongoose default (pluralized lowercase) — `users`, `leads`, `notes`, `activities`
- **Foreign keys:** `<entity>Id` — `leadId`, `authorId`. The outlier is `assignedTo` (kept because "assigned to user X" reads better than "assigned to userId X" everywhere in the code)
