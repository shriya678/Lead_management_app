# Requirements

This document captures the Digital Heroes Task A brief verbatim, then maps every requirement to where it's satisfied in the codebase, and self-checks against the evaluation rubric.

---

## Task A brief (verbatim from HR email)

> **Full Stack Development**
> **What this tests:** The complete loop: frontend, backend, data model, auth, and deployment of one coherent product.
>
> **TASK A — Build a lead platform, not a lead form**
> Build a lead management application that a small sales team could actually use.
>
> a) Public capture form plus an authenticated application with at least two roles — admin and member — and enforced permissions on both client and server.
>
> b) Lead lifecycle: status pipeline, assignment to a user, notes with timestamps, and an activity trail.
>
> c) A JSON API for leads with pagination, filtering, and proper status codes — documented in the README.
>
> d) Automated tests covering auth rules and at least two core flows, plus deployment on any free tier.
>
> **Deliverables**
> - Public GitHub repo with tests
> - Deployed application + credentials for each role
> - API documentation
>
> **LIVE BUILD REQUIREMENT** — visible footer credit line reading "Built for Digital Heroes Training Task", linked to digitalheroesco.com.

---

## Traceability — how each requirement is met

### (a) Public capture form + authenticated app with 2 roles + client & server permissions

| Sub-requirement | Implementation |
|---|---|
| Public capture form | Frontend: [`SubmitPage.jsx`](../client/src/pages/SubmitPage.jsx). Backend: `POST /api/public/leads` in [`publicLeadsController.js`](../server/src/controllers/publicLeadsController.js) (no auth) |
| Two roles | `User.role` enum `['admin', 'member']` in [`User.js`](../server/src/models/User.js); seeded via `npm run seed` |
| Client permission enforcement | [`ProtectedRoute`](../client/src/components/ProtectedRoute.jsx) with `role="admin"` gate; conditional UI (assign / delete / users-sidebar-link hidden for members) in [`LeadsPage.jsx`](../client/src/pages/LeadsPage.jsx), [`AppShell.jsx`](../client/src/components/AppShell.jsx) |
| Server permission enforcement | [`requireAuth`](../server/src/middleware/requireAuth.js) + [`requireRole`](../server/src/middleware/requireRole.js) middleware; inline `isMemberOwner` checks in [`leadsController.js`](../server/src/controllers/leadsController.js), [`notesController.js`](../server/src/controllers/notesController.js), [`activityController.js`](../server/src/controllers/activityController.js) |

### (b) Lead lifecycle: status pipeline, assignment, notes with timestamps, activity trail

| Sub-requirement | Implementation |
|---|---|
| Status pipeline | `Lead.status` enum `['new', 'contacted', 'qualified', 'won', 'lost']`; `PATCH /api/leads/:id` (owner or admin) + inline [`StatusSelect`](../client/src/components/StatusSelect.jsx) |
| Assignment | Dedicated `PATCH /api/leads/:id/assign` (admin only) + inline [`AssignSelect`](../client/src/components/AssignSelect.jsx) dropdown |
| Notes with timestamps | [`Note`](../server/src/models/Note.js) model with `createdAt`; `POST /api/leads/:id/notes`; [`NoteForm`](../client/src/components/NoteForm.jsx) + [`NoteList`](../client/src/components/NoteList.jsx) |
| Activity trail | [`Activity`](../server/src/models/Activity.js) model, auto-written on every mutation via [`writeActivity`](../server/src/utils/activityLog.js); rendered in [`ActivityTimeline`](../client/src/components/ActivityTimeline.jsx) with per-type copy + icons |

### (c) JSON API with pagination, filtering, status codes, documented

| Sub-requirement | Implementation |
|---|---|
| JSON API | All endpoints JSON; `express.json({limit: '100kb'})` body parsing |
| Pagination | `GET /api/leads?page&limit` — offset pagination, max `limit=100`; response includes `{items, page, limit, total, pages}` |
| Filtering | `?status`, `?assignedTo` (userId or `unassigned`), `?q` (name/email substring, regex-escaped) |
| HTTP status codes | 200 · 201 · 204 success; 400 validation; 401 no/invalid token; 403 role/ownership fail; 404 not found; 409 duplicate email. Mapped centrally in [`errorHandler.js`](../server/src/middleware/errorHandler.js) |
| Documented in README | [`../README.md`](../README.md) — full API reference table |

### (d) Automated tests + free-tier deployment

| Sub-requirement | Implementation |
|---|---|
| Auth-rules tests | [`server/tests/auth.test.js`](../server/tests/auth.test.js) — 18+ cases covering `requireAuth`, `requireRole`, ownership, no-user-enumeration, `passwordHash` never leaked |
| Two core flow tests | [`server/tests/flows.test.js`](../server/tests/flows.test.js) — full lifecycle flow + 25-lead pagination / filter flow |
| Extra endpoint tests | [`server/tests/leads-api.test.js`](../server/tests/leads-api.test.js) — 15+ validation / edge cases |
| Free-tier deployment | Render (API) + Vercel (UI) + MongoDB Atlas M0 |

### LIVE BUILD requirement

| Sub-requirement | Implementation |
|---|---|
| Footer credit line | [`Footer.jsx`](../client/src/components/Footer.jsx) — rendered inside both `AppShell` and `PublicShell` (visible on every page); linked to `https://digitalheroesco.com` |
| Live URL | See top of [`../README.md`](../README.md) |

---


## Deliberate cuts (documented for interview honesty)

Items explicitly out of scope to meet the 24-hour budget:

- Real-time updates via Socket.IO
- Email notifications on assignment
- Password reset / forgot-password
- Soft delete (`deletedAt` field)
- Public user registration (admin-only creation is deliberate)
- Rate limiting on public form (called out as a next step)
- Note editing / deleting (immutable audit trail — see [`decisions.md`](decisions.md))
- Frontend automated tests (brief specifies "auth + 2 flows"; backend Jest suite covers both)

All cuts documented with rationale in [`decisions.md`](decisions.md).
