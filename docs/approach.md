# Approach

How the problem was broken down and executed.

---

## Framing

The brief is deceptively short. Two phrases carried most of the weight:

1. *"Build a lead platform, not a lead form."* — the reviewer explicitly warns against interpreting this as a contact form dumping to email. It's a mini-CRM.
2. *"We are looking for your judgment and your voice, and your interview will be built around the decisions you made."* — decision quality > cleverness. Every non-trivial choice needs a defensible reason.

Given those, the plan optimized for:
- **Data-model + auth correctness first** (30 + 25 = 55 pts of the rubric)
- **Test coverage + deployment as first-class deliverables**, not afterthoughts (25 pts)
- **Documented trade-offs everywhere** a real decision was made (interview cheat sheet)

---

## Phased build order — 11 feature branches

Every feature ships branch-per-feature off `main`, merged in sequence:

| # | Branch | What it delivered |
|---|---|---|
| 1 | `feature/backend-scaffold` | Express + Mongoose + folder layout + health check |
| 2 | `feature/auth-and-users` | JWT auth + bcryptjs + role middleware + seed script |
| 3 | `feature/leads-api` | Lead model + public capture + CRUD + pagination + filtering |
| 4 | `feature/notes-and-activity` | Note + Activity models + auto-log on mutations + cascade delete |
| 5 | `feature/backend-tests` | Jest + Supertest + memory-server; auth + 2 flows + 15 edges = ~37 tests |
| 6 | `feature/frontend-scaffold` | Vite + Tailwind + Router + AuthContext + Axios interceptor + shells |
| 7 | `feature/public-capture-form` | Real `/submit` UI + honeypot + validation |
| 8 | `feature/auth-pages` | Real `/login` UI + return-to path + demo-cred hint |
| 9 | `feature/leads-dashboard` | Real `/leads` UI: filters, pagination, inline mutations, delete |
| 10 | `feature/lead-detail-and-admin` | Real `/leads/:id` + activity timeline + `/admin/users` + Add-user + Edit-lead modals |
| 11 | `feature/deploy-and-docs` | Render + Vercel deploy + README + this `docs/` folder |

Plus one polish branch: `fix/phone-validation` between features 9 and 10.

### Why this order

- **Backend before frontend.** Every UI feature depends on the API existing. Testing the backend in isolation (curl + Postman) before wiring UI eliminates "is it the client or the server?" confusion.
- **Tests before frontend.** Feature 5's test suite runs against feature 3+4's controllers with no UI involved — proves the API is correct on its own merits.
- **Scaffold everything before content.** Frontend feature 6 stubs every route with a placeholder page. Navigation was testable from day one, and each subsequent frontend feature just filled in content.
- **Deployment last.** No point deploying broken code. Local flow was fully verified before any Render / Vercel dashboard clicks.

---

## Per-feature discipline

For every branch, the same 5-step process before writing any code:

1. **Explain** what the feature does + which brief requirement it satisfies
2. **Trade-off table** — realistic options with pros/cons + recommendation. **Even for "obvious" choices** — the log becomes the interview cheat sheet
3. **Files & flow** — files to add/modify + request/response diagrams
4. **Code** — write it
5. **Commit message + PR description** — pre-drafted so nothing gets lost when squashing

This is why [`decisions.md`](decisions.md) has ~18 entries — every branch contributed at least one meaningful trade-off.

---

## Time budget (24 hours)

Rough allocation:
- Backend + tests: ~40%
- Frontend: ~40%
- Deploy + docs + polish: ~20%

Backend went first specifically so that if the timer ran short, at least a working API + Postman collection could ship as a "backend-complete" deliverable.

---

## What was cut and why

Every cut was a deliberate scope decision to protect the graded items:

- **Real-time updates (Socket.IO)** — not in brief; doubles surface area
- **Email notifications** — not in brief; external service + secrets
- **Password reset** — admin creates users; nobody self-serves
- **Soft delete** — cascade of `deletedAt` filters across every query = high bug risk
- **Public registration** — instant security fail on the demo URL
- **Rate limiting on public form** — honeypot + backend validation enough for demo
- **Note edit/delete** — immutable notes preserve audit-trail credibility
- **Frontend tests** — brief specifies "auth + 2 flows"; backend Jest suite delivers both

Full rationale for each cut in [`decisions.md`](decisions.md).

---

## What paid off

Small investments that returned outsized value later:

- **`app.js` / `server.js` split (feature 1)** — Supertest imported `app.js` directly in feature 5, no port collision, no listen state.
- **Central error handler + `asyncHandler` (feature 1)** — every controller stays flat; Mongoose→HTTP status mapping added in feature 3 improved every route at once.
- **Best-effort `writeActivity` helper (feature 4)** — activity writes never fail a mutation; log-and-continue keeps UX clean.
- **`FormField` + `isEmail` extracted in feature 7** — reused verbatim in features 8 and 10 (login form, add-user modal, edit-lead modal).
- **URL-driven filters (feature 9)** — reviewer can paste a filtered URL and see the exact same view; back button works.
- **Postman collection grown per feature** — final artifact has ~30 requests + ~50 assertions; reviewer runs the full collection to verify everything at once.
