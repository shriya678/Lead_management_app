# Architecture

System design, request flow, permission model, and folder layout.

---

## System diagram

```
┌────────────┐         ┌────────────┐         ┌────────────┐
│  Browser   │◄───────►│  Vercel    │         │  Render    │
│  (any)     │  HTTPS  │  (React    │◄──HTTP──│  (Express  │◄──► MongoDB Atlas
└────────────┘         │   static)  │         │   API)     │      (M0 free)
                       └────────────┘         └────────────┘
```

Three separately deployed pieces, three vendors, one repo:
- **Vercel** — serves the built React SPA (static files)
- **Render** — runs the Node/Express API on a Web Service (long-lived process)
- **MongoDB Atlas** — hosts the database (M0 free tier)

CORS: Render backend allows only the Vercel origin via the `FRONTEND_URL` env var.

---

## Folder layout

```
Lead_management_app/
├── server/                    Express API
│   ├── src/
│   │   ├── server.js          bootstrap: loads env → connects Mongo → listens
│   │   ├── app.js             Express app factory (also imported by tests)
│   │   ├── config/env.js      env var validation + defaults
│   │   ├── db/connect.js      Mongoose connect / disconnect
│   │   ├── routes/            route mounting (health, auth, users, leads, publicLeads, leadNotes, leadActivity)
│   │   ├── controllers/       request handlers
│   │   ├── models/            Mongoose schemas (User, Lead, Note, Activity)
│   │   ├── middleware/        requireAuth, requireRole, errorHandler
│   │   ├── utils/             asyncHandler, jwt, ownership, pagination, activityLog
│   │   └── scripts/seed.js    idempotent demo admin + member creation
│   └── tests/                 Jest + Supertest + memory-server
│       ├── env.setup.js       synchronous env-var setup
│       ├── helpers/           db lifecycle, factories, auth shortcuts
│       ├── auth.test.js       ~18 auth / role / ownership cases
│       ├── leads-api.test.js  ~15 validation / edge cases
│       └── flows.test.js      2 brief-required end-to-end flows
│
├── client/                    Vite React app
│   └── src/
│       ├── main.jsx           React root + Router + AuthProvider + Toaster
│       ├── App.jsx            route tree
│       ├── lib/               api (axios instance), format, validate
│       ├── context/           AuthContext
│       ├── hooks/             useLeads, useLead, useLeadNotesAndActivity
│       ├── components/        Shells, form field, badges, selects, pagination, modal, timeline
│       └── pages/             Submit, Login, Leads, LeadDetail, Users, NotFound
│
├── postman/                   Growing Postman collection (~30 requests, ~50 assertions)
└── docs/                      requirements, approach, architecture, data-model, decisions
```

Layered structure inside `server/src/` (routes → controllers → models). Familiar to every Node reviewer; ~30 seconds to orient.

---

## Request flow — anatomy of one call

Walkthrough of `PATCH /api/leads/:id` (a member changing status on their own lead):

```
Client:
  PATCH /api/leads/abc123
  Authorization: Bearer eyJhbGc...
  { "status": "contacted" }
        │
        ▼
server.js (already booted; app.listen accepted the connection)
        │
        ▼
app.js middleware chain (in order):
  1. helmet()                     — security headers
  2. cors({origin: FRONTEND_URL}) — allow browser
  3. express.json({limit:'100kb'})— parse body
  4. morgan('tiny')               — log the request line
        │
        ▼
routes/index.js → mounts '/leads' → routes/leads.js
        │
        ▼
routes/leads.js: router.use(requireAuth) → requireAuth middleware
  - Read 'Authorization' header, split "Bearer "
  - verifyAccessToken(token) — verifies with JWT_SECRET (NOT the refresh secret)
  - req.user = { id, role, name }  (from access-token payload)
  - Expired access token → 401; client's Axios interceptor calls /auth/refresh
    and retries this request transparently. See docs/data-model.md#refresh-flow.
        │
        ▼
router.patch('/:id', asyncHandler(leadsController.update))
        │
        ▼
leadsController.update:
  1. Validate lead id (mongoose.isValidObjectId)               → 404 if malformed
  2. Reject 'assignedTo' in body (must use /assign endpoint)   → 400 if present
  3. Lead.findById(:id)                                        → 404 if missing
  4. If member and !isMemberOwner(lead, req.user)              → 403
  5. Build updates from role-whitelist (admin: 6 fields; member: 3)
  6. Validate updates.status against enum                      → 400 if invalid
  7. Object.assign + save
  8. writeActivity(...) for status_changed and/or updated      (best-effort)
  9. populate assignedTo → res.json({ lead })
        │
        ▼
Response: 200 { lead: {...} }

If any step throws → asyncHandler forwards → errorHandler middleware:
  - ValidationError / CastError                → 400
  - duplicate key (E11000)                     → 409
  - err.status || err.statusCode               → forwarded
  - else                                        → 500
  - Response: { error, message, ...details }
```

---

## Permission model

Enforced on **both** client and server. Client is UX guidance; server is authoritative.

### Server side — matrix

| Action | Admin | Member |
|---|---|---|
| `POST /api/public/leads` | ✅ (no auth) | ✅ (no auth) |
| `POST /api/auth/login` | ✅ | ✅ |
| `POST /api/auth/register` | ✅ | ❌ 403 |
| `GET /api/users` | ✅ | ❌ 403 |
| `GET /api/leads` — list | ✅ (all) | ✅ (assigned to self only) |
| `GET /api/leads/:id` | ✅ (any) | ✅ (own only, else 403) |
| `PATCH /api/leads/:id` | ✅ (name/email/phone/company/source/status) | ✅ own only (phone/company/status) |
| `PATCH /api/leads/:id/assign` | ✅ | ❌ 403 |
| `DELETE /api/leads/:id` | ✅ | ❌ 403 |
| `POST /api/leads/:id/notes` | ✅ (any) | ✅ (own only, else 403) |
| `GET /api/leads/:id/notes` | ✅ (any) | ✅ (own only) |
| `GET /api/leads/:id/activity` | ✅ (any) | ✅ (own only) |

### Enforcement mechanics

- **`requireAuth`** — chains at the top of every protected router. Rejects missing / malformed / invalid / expired tokens with 401 identical shape (no expiry hint leak).
- **`requireRole('admin')`** — factory; chains after `requireAuth` on admin-only routes.
- **Inline ownership check** — `if (req.user.role === 'member' && !isMemberOwner(lead, req.user)) return 403`. Shared helper in `utils/ownership.js`.

### Client side — matches UI

- **`ProtectedRoute`** — redirects unauth to `/login` (with return-to path via `state.from`); role prop redirects wrong role to `/leads`.
- **Conditional UI** — Assign dropdown, Delete button, Users sidebar link, Assign filter all hidden for members.
- **Server is trusted:** a member using DevTools to un-hide the Delete button still gets 403 from the server.

---

## Activity write pattern

Activities are auto-generated by mutation controllers:

| Trigger | Type | Meta |
|---|---|---|
| `POST /public/leads` | `created` | `{ source }` (actorId null) |
| `PATCH /leads/:id/assign` | `assigned` | `{ from, to }` (userIds or null) |
| `PATCH /leads/:id` — status changed | `status_changed` | `{ from, to }` |
| `PATCH /leads/:id` — other fields changed | `updated` | `{ fields: [...] }` |
| `POST /leads/:id/notes` | `note_added` | `{ noteId, preview }` (first 80 chars) |

Every write goes through `utils/activityLog.writeActivity({...})` which is **best-effort**: wrapped in try/catch, logs to `console.error` on failure, never rethrows. Rationale: the user's actual action (updating status, adding note) should not fail because an audit-write hiccuped.

The controller writes the activity **after** the successful save — a failed save never produces a false activity entry.

---

## Error handling

- **`utils/asyncHandler`** — wraps every async controller so thrown errors reach the central handler instead of leaving requests hanging.
- **`middleware/errorHandler`** — central JSON responder. Maps:
  - Mongoose `ValidationError` / `CastError` → 400
  - duplicate-key `E11000` → 409
  - `err.status || err.statusCode || 500` otherwise
  - Logs 5xx to `console.error`
- **Response shape** — always `{ error: <name>, message: <human string>[, details] }`. Predictable for client + Postman assertions.

---

## Deployment topology

```
GitHub (main branch)
  │
  ├── auto-deploy trigger ─────────► Render (server/)  ── free Web Service, cold start ~30s idle
  │                                       │
  │                                       ▼
  │                                  MongoDB Atlas  (M0 free, 0.0.0.0/0 for demo)
  │
  └── auto-deploy trigger ─────────► Vercel (client/)  ── static SPA, always warm
                                          │
                                          ▼
                                     User's browser  → calls Render API via VITE_API_URL
```

CORS whitelist: Render's `FRONTEND_URL` env var = Vercel URL.

---

## Local dev topology

```
localhost:5173 (Vite dev)  ──►  localhost:5000 (Express, nodemon)  ──►  local Mongo OR Atlas
```

Frontend Axios `baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'`.
