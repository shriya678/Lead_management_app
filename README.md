# Lead Management App

> Built for **Digital Heroes** Training Task — 24-hour full-stack build.

A mini-CRM: public lead capture, authenticated dashboard, role-based permissions, status pipeline, timestamped notes, activity trail, paginated + filterable JSON API, automated tests, free-tier deployment.

---

## Live demo

- **Frontend:** https://lead-management-app-zeta.vercel.app
- **Backend API:** https://lead-management-app-qu6r.onrender.com
- Health check: https://lead-management-app-qu6r.onrender.com/api/health

> Render's free tier cold-starts after 15 min of inactivity — first request after a nap can take ~30-45s. Subsequent requests are instant.

## Demo credentials

| Role   | Email             | Password    |
|--------|-------------------|-------------|
| Admin  | admin@demo.com    | Admin@123   |
| Member | member@demo.com   | Member@123  |

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS + React Router + Axios |
| Backend | Node.js + Express + Mongoose |
| Database | MongoDB Atlas (free M0) |
| Auth | JWT (`Authorization: Bearer`) + refresh token · 15m access + 7d refresh · bcryptjs · dual-secret stateless refresh |
| Tests | Jest + Supertest + mongodb-memory-server (~37 tests) |
| Deploy | Render (API) + Vercel (UI) + Atlas (DB) |

## Repo layout

```
Lead_management_app/
├── server/     Express API (7 controllers, 4 models, ~37 Jest tests)
├── client/     React SPA (Vite, 6 pages, ~15 components)
├── postman/    Importable Postman collection (~30 requests, ~50 assertions)
└── docs/       Requirements, architecture, data model, decisions log
```

---

## Local setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas connection string _(or local Mongo)_

### Backend

```bash
cd server
npm install
cp .env.example .env
# Edit .env — set MONGO_URI and generate JWT_SECRET:
#   openssl rand -hex 32
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

npm run seed    # Idempotent — creates demo admin + demo member
npm run dev     # → http://localhost:5000
```

Health check: `curl http://localhost:5000/api/health` → `{ "status": "ok", "db": "connected" }`

### Frontend

```bash
cd client
npm install
cp .env.example .env    # VITE_API_URL defaults to http://localhost:5000/api

npm run dev             # → http://localhost:5173
```

### Tests

```bash
cd server
npm test                # ~37 tests
npm run test:coverage   # Coverage report
```

First test run downloads a ~50MB Mongo binary (cached at `~/.cache/mongodb-binaries`). Later runs are fast (~10-15s).

### Lint

```bash
cd server && npm run lint
cd client && npm run lint
```

---

## API reference

Base URL (local): `http://localhost:5000/api`.
Every endpoint returns JSON. Error responses shape: `{ error, message, [details] }`.

### Public

| Method | Endpoint | Body | Status |
|---|---|---|---|
| `POST` | `/public/leads` | `{ name, email, phone?, company?, source? }` | 201 · 400 |

### Auth

| Method | Endpoint | Body | Auth | Status |
|---|---|---|---|---|
| `POST` | `/auth/login` | `{ email, password }` | — | 200 · 400 · 401 |
| `POST` | `/auth/refresh` | `{ refreshToken }` | — | 200 · 400 · 401 |
| `POST` | `/auth/register` | `{ name, email, password, role }` | admin | 201 · 400 · 401 · 403 · 409 |

`POST /auth/login` returns `{ accessToken, refreshToken, user }`. The access token is short-lived (15 min); the client hits `/auth/refresh` transparently on 401 to swap the expired access for a new one, retrying the original request. A stale refresh token forces a real re-login.

### Leads

| Method | Endpoint | Auth | Status |
|---|---|---|---|
| `GET` | `/leads?page&limit&status&assignedTo&q` | any | 200 · 400 · 401 |
| `GET` | `/leads/:id` | any (member → own only) | 200 · 401 · 403 · 404 |
| `PATCH` | `/leads/:id` | any (member → own only, whitelist per role) | 200 · 400 · 401 · 403 · 404 |
| `PATCH` | `/leads/:id/assign` | admin | 200 · 400 · 401 · 403 · 404 |
| `DELETE` | `/leads/:id` | admin | 204 · 401 · 403 · 404 |

`GET /leads` query params:
- `page` (default 1), `limit` (default 20, capped 100)
- `status` (enum: `new` / `contacted` / `qualified` / `won` / `lost`)
- `assignedTo` (userId or `unassigned`)
- `q` (case-insensitive substring, matches name OR email)

Response: `{ items, page, limit, total, pages }`.

### Notes & Activity

| Method | Endpoint | Body | Auth | Status |
|---|---|---|---|---|
| `POST` | `/leads/:id/notes` | `{ body }` (≤ 5000 chars) | any (member → own only) | 201 · 400 · 401 · 403 · 404 |
| `GET` | `/leads/:id/notes?page&limit` | — | any (member → own only) | 200 · 401 · 403 · 404 |
| `GET` | `/leads/:id/activity?page&limit` | — | any (member → own only) | 200 · 401 · 403 · 404 |

### Users (admin)

| Method | Endpoint | Auth | Status |
|---|---|---|---|
| `GET` | `/users` | admin | 200 · 401 · 403 |

### Example curl

```bash
# Login as admin — response has { accessToken, refreshToken, user }
LOGIN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"Admin@123"}')
TOKEN=$(echo "$LOGIN" | jq -r .accessToken)
REFRESH=$(echo "$LOGIN" | jq -r .refreshToken)

# List leads with filter
curl "http://localhost:5000/api/leads?status=new&page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"

# Exchange the refresh token for a new access token (client does this
# automatically on 401 — this is just to show the endpoint by hand)
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH\"}"

# Public lead capture (no auth)
curl -X POST http://localhost:5000/api/public/leads \
  -H "Content-Type: application/json" \
  -d '{"name":"Rahul","email":"rahul@example.com","phone":"+91 9876543210"}'
```

### Postman collection

Import [`postman/lead-management.postman_collection.json`](postman/lead-management.postman_collection.json). Run the **`00. Setup`** folder first (login requests auto-save tokens as collection variables), then any folder — or the whole collection via Runner. ~30 requests, ~50 assertions.

---

## Deployment

### 1. MongoDB Atlas (free M0)
1. Create a cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. **Network Access** → add `0.0.0.0/0` (or Render's egress IP for stricter).
3. **Database Access** → create a user with read/write on the DB.
4. Copy the connection string: `mongodb+srv://<user>:<pwd>@<cluster>/lead_management?retryWrites=true&w=majority`.

### 2. Backend on Render (free tier)
1. Push repo to GitHub (public).
2. [render.com](https://render.com) → **New +** → **Web Service** → connect the repo.
3. Settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Node version:** 18+
4. **Environment** tab — add (see [`server/.env.production.example`](server/.env.production.example)):
   - `MONGO_URI` = Atlas connection string
   - `JWT_SECRET` = 64-char random hex (`openssl rand -hex 32`) — signs 15m access tokens
   - `JWT_REFRESH_SECRET` = a **different** 64-char random hex — signs 7d refresh tokens
   - `JWT_ACCESS_EXPIRES_IN` = `15m` (optional, default)
   - `JWT_REFRESH_EXPIRES_IN` = `7d` (optional, default)
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = placeholder for now (`http://localhost:5173`) — update in step 4
5. Deploy → wait for `GET /api/health` to return 200.

### 3. Frontend on Vercel (free tier)
1. [vercel.com](https://vercel.com) → **Add New** → **Project** → import the same GitHub repo.
2. **Root Directory:** `client`. Framework preset: **Vite** (auto-detected).
3. Environment variable: `VITE_API_URL` = `https://<render-app>.onrender.com/api`
4. Deploy. Note the assigned Vercel URL.
5. `client/vercel.json` handles SPA rewrites so `/leads/:id` doesn't 404 on refresh.

### 4. Wire CORS
Back to Render → Environment → update `FRONTEND_URL` to the Vercel URL → **Save, Rebuild and Deploy**.

### 5. Seed prod DB (one-time)
```bash
cd server
# TEMPORARILY set MONGO_URI in local .env to your Atlas URI
npm run seed
# Restore your local .env when done
```
Verify by logging in as admin at your Vercel URL.

### 6. Smoke test
- Visit Vercel `/submit` → submit a test lead
- Log in as admin → see the lead in the dashboard
- Assign to member → log out → log in as member → change status → add a note
- Open the lead → activity timeline shows `created` + `assigned` + `status_changed` + `note_added`

## Documentation

Deeper docs in [`docs/`](docs/):

- [`requirements.md`](docs/requirements.md) — Task A brief + traceability checklist per requirement
- [`approach.md`](docs/approach.md) — how the problem was broken down; phased build order; time budget
- [`architecture.md`](docs/architecture.md) — system diagram, folder layout, request flow, permission model
- [`data-model.md`](docs/data-model.md) — Mongoose schemas, indexes, cascade delete, JWT payload
- [`decisions.md`](docs/decisions.md) — ADR-style trade-off log (~18 entries) — the interview cheat sheet

---

## AI usage

- This project was built with AI assistance (Claude, via the Claude Code CLI). 

AI helped with:
- Code generation for Fast Implementation
- Documentation
