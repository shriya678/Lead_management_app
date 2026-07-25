# Decisions log

ADR-style short entries. One per meaningful trade-off across the 11 feature branches. This is the interview cheat sheet — every choice here has a defensible reason.

---

### 1. JWT in `localStorage`, not cookies

**Context:** Auth token needs to travel with API calls and survive page refresh.
**Chose:** JWT in `localStorage`, sent as `Authorization: Bearer <token>`.
**Rejected:** `httpOnly` cookies (XSS-safer but needs `SameSite=None; Secure` + `credentials: include` + matching CORS — fragile cross-origin between Vercel and Render); server sessions (stateful, needs shared store); `sessionStorage` (clears on tab close — bad UX; still XSS-vulnerable).
**Consequence:** XSS is a real risk in principle. Mitigated by React's default escaping, no `dangerouslySetInnerHTML`, no third-party scripts. Axios interceptor auto-logs-out on 401. For a production CRM, would move to `httpOnly` cookies with proper CORS setup.

---

### 2. MongoDB + Mongoose, not PostgreSQL

**Context:** Persist users, leads, notes, activities with basic relations.
**Chose:** MongoDB Atlas + Mongoose.
**Rejected:** Postgres + Prisma/Sequelize (stricter typing, cleaner joins — but heavier ORM setup); DynamoDB (single-vendor lock-in, less familiar).
**Consequence:** No true transactions on Atlas M0 without ceremony; embedded-vs-referenced choice per entity. All refs validated explicitly in controllers. Matches my resume experience.

---

### 3. `bcryptjs`, not native `bcrypt` or `argon2`

**Context:** Password hashing.
**Chose:** `bcryptjs` (pure JS).
**Rejected:** native `bcrypt` (marginally faster but native module can fail to compile on free deploy platforms — real risk on Render); `argon2` (winner of PHC but native module + less common in JS tutorials).
**Consequence:** Slightly slower than native at 10 rounds — imperceptible. Deploy reliability > microseconds.

---

### 4. Admin-only user creation, no public register

**Context:** Who can create user accounts?
**Chose:** Only admins can create users. First admin comes from `npm run seed`. `POST /api/auth/register` is admin-only.
**Rejected:** Public `POST /register` any role (anyone could create an admin on the demo URL — instant security fail); public register member-only (random visitors becoming "members" with UI access is confusing for a CRM demo).
**Consequence:** Reviewer must use seeded credentials — documented prominently on the login page and in the README.

---

### 5. 7-day JWT expiry, no refresh token

**Context:** How long should sessions last?
**Chose:** 7-day access token, no refresh.
**Rejected:** 15-min access + refresh token (better security posture but doubles endpoint count + rotation logic — 2-3 hours of scope); 24h (safer but reviewer might get logged out mid-interview).
**Consequence:** Can't revoke a leaked token before 7 days. Production would move to 15-min access + rotating refresh with a revocation table.

---

### 6. Manual validation in controllers, no `zod`/`joi`

**Context:** Request body validation.
**Chose:** Native field checks + Mongoose schema validators; central `errorHandler` maps Mongoose `ValidationError` → 400.
**Rejected:** `zod` (type-safe, great DX — but value peaks with TypeScript); `joi` (similar cost).
**Consequence:** Slightly verbose per-field checks in each controller. Bodies are small (2-6 fields), verbosity is acceptable.

---

### 7. Offset pagination, not cursor

**Context:** How to page through `/api/leads`.
**Chose:** `?page=&limit=` (max 100). Response includes `{items, page, limit, total, pages}`.
**Rejected:** Cursor pagination (stable under concurrent inserts, faster on huge collections — but harder UI: no jump-to-page; overkill for demo scale); no pagination (brief-non-compliant).
**Consequence:** Skips can drift under heavy concurrent inserts. Not realistic at demo scale. Enables straightforward page-number UI.

---

### 8. Hard delete, not soft delete

**Context:** What happens when a lead is deleted?
**Chose:** Hard delete with explicit cascade (notes + activities deleted before the lead).
**Rejected:** Soft delete (`deletedAt` field + filter every query) — recoverable but every read query gains a `deletedAt: null` filter, high bug risk if any query forgets it.
**Consequence:** Lost data if an admin misclicks. Production would soft-delete. Admin-only + `window.confirm` mitigates for demo.

---

### 9. Field-whitelist per role on `PATCH /leads/:id`

**Context:** Members shouldn't be able to change `assignedTo` (steal ownership) or other identity fields via a lead update.
**Chose:** Per-role field whitelist. Admin: name/email/phone/company/source/status. Member: status/phone/company only. Explicit rejection of `assignedTo` in body (points to `/assign` endpoint).
**Rejected:** Full replacement (`PUT`) — simpler but risky; accept any field — biggest attack surface.
**Consequence:** Slightly verbose per-role branch in the controller. Explicit == safe.

---

### 10. Best-effort activity writes, not transactional

**Context:** Should a failed activity write fail the user's mutation?
**Chose:** Best-effort. `writeActivity` wraps in try/catch, logs to `console.error`, never rethrows. Parent mutation always succeeds.
**Rejected:** Transactional both-or-nothing — needs replica-set session; if audit write fails, user's actual status update also fails — bad UX for a nice-to-have.
**Consequence:** Small chance of missing activity entries under Mongo blips. Audit is nice-to-have, not primary function. Console errors surface any incident in Render logs.

---

### 11. Immutable notes, no edit/delete

**Context:** Should users be able to edit/delete their notes?
**Chose:** POST + GET only. No PATCH, no DELETE on notes.
**Rejected:** Author can edit/delete own note (familiar UX but undermines audit trail — "who added this note earlier?" becomes ambiguous); admin can delete any note (extra endpoint, not in brief).
**Consequence:** Users can't fix typos. Production would add a 5-minute grace-window edit.

---

### 12. Explicit cascade delete, not middleware or transactions

**Context:** When a lead is deleted, notes + activities must go with it.
**Chose:** Explicit `Note.deleteMany + Activity.deleteMany + Lead.findByIdAndDelete` in the controller.
**Rejected:** Mongoose `post('findOneAndDelete')` hook (hidden behavior; if any code path bypasses the hook, orphans); transaction (Atlas M0 supports it but adds session ceremony).
**Consequence:** Three ops instead of one atomic. Not truly atomic — a mid-flight crash could leave orphans. Acceptable for scope; would use a transaction in production.

---

### 13. Per-file `mongodb-memory-server` for tests

**Context:** How to give tests a real DB without external dependency.
**Chose:** `mongodb-memory-server`, per test file (helper `setupTestDB()` registers `beforeAll` / `afterEach` / `afterAll` hooks in each file).
**Rejected:** Shared test DB (needs local Mongo; parallel workers collide); full mocks (misses real model/index behavior — false confidence); `globalSetup` shared memory-server (env vars set in globalSetup don't reliably propagate to workers).
**Consequence:** ~1-2s extra boot per test file vs shared. Worth the seconds for correctness — every file fully isolated. `npm test` needs zero external setup.

---

### 14. React Context + `useState` for global state, not Redux/Zustand

**Context:** Auth state needs to survive route changes.
**Chose:** `AuthContext` + `useState` (`{user, token, login, logout}`). Local component state for everything else.
**Rejected:** Redux Toolkit (massive overkill for one global object); Zustand (extra dep for problems we don't have).
**Consequence:** No devtools time-travel. Auth is the *only* global state — one lib for one object is not the right trade.

---

### 15. URL-driven filter state on `/leads`, not component state

**Context:** Where should filter / pagination state live?
**Chose:** `useSearchParams` — filters live in `?status=&assignedTo=&q=&page=` query string.
**Rejected:** Component state (refresh loses filters; not shareable); both (sync bugs).
**Consequence:** Every filter change triggers a URL update + refetch. Refresh preserves state. Back/forward buttons work. Reviewer can paste a filtered URL and get the same view.

---

### 16. Pessimistic UI for mutations, not optimistic

**Context:** Inline status change / assign / delete — update UI before or after server confirms?
**Chose:** Pessimistic. Row disables during the request, on success `refetch()`, on error revert + toast.
**Rejected:** Optimistic (snappier feel but per-mutation rollback logic; more bug surface).
**Consequence:** Slight perceived delay (~300ms). Correct-by-construction; matches consistent pattern across the whole app.

---

### 17. Hand-rolled `<Modal>`, not `headlessui`/`radix`

**Context:** Add-user modal + edit-lead modal need overlay + close-on-escape.
**Chose:** Hand-rolled ~40-line `Modal` with portal, backdrop, Escape / click-outside close, body-scroll lock.
**Rejected:** `@headlessui/react` — battle-tested focus trap + a11y — but extra dep for two modals in the whole app.
**Consequence:** No focus trap (basic `autoFocus` on first field is enough for scope). If we grew to 5+ modals, would swap in a library.

---

### 18. Indian phone validation client-only, backend permissive

**Context:** Phone field on `/submit` was initially accepting anything.
**Chose:** Client validates optional Indian format (`+91` prefix optional, 10 digits, strips formatting chars). Backend keeps `phone: String` unconstrained.
**Rejected:** Full E.164 international; ultra-strict `+91` required; backend also validates strictly.
**Consequence:** Client can be stricter than backend when the business rule is "the form on OUR website is for India". Backend permissive means a real CRM can accept international leads via API (CSV import, third-party integrations) without a schema migration.
