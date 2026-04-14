# SiteBizAI

Monorepo with:

- **`app/`**: Next.js app (blog + admin + mini-CRM leads) with Prisma + Postgres + optional Yandex Object Storage (S3-compatible).
- **`server/`**: Express API that analyzes a website (HTML parsing + optional PageSpeed + optional AI via OpenAI-compatible API).
- **`client/`**: Vite + React UI for the analyzer.

## Architecture (high level)

### Runtime services (Docker)

- **Postgres**: `db` → `localhost:5432`
- **Next.js app**: `app` → `http://localhost:3000`
- **Analyzer API**: `analyzer-server` → `http://localhost:5051`
- **Analyzer UI**: `analyzer-client` → `http://localhost:5173`

### Data flows

- Analyzer UI (`5173`) calls Analyzer API (`5051`):
  - `POST /analyze` → basic parsing + AI audit (if OpenAI works)
  - `POST /analyze/losses` → AI losses estimate
  - `POST /solution-offer` → AI “implementation plan / offer”
  - When user submits the lead form, the UI sends `POST http://localhost:3000/api/leads` (Next app API) to create a lead in Postgres.

- Next.js app (`3000`) uses Postgres via Prisma:
  - Public blog pages read published posts
  - Admin pages manage posts and leads

## Quick start (recommended): Docker Compose

1) Create `.env` in repo root (copy from `.env.example`).

2) Start everything:

```bash
docker compose up -d --build
```

3) Open:

- Analyzer UI: `http://localhost:5173`
- Next app (blog/admin): `http://localhost:3000`

## Local dev (without Docker)

### Analyzer

From repo root:

```bash
npm run install:all
npm run dev
```

### Next app

From `app/`:

```bash
npm install
npm run dev
```

Note: Prisma client generation may be needed after schema changes:

```bash
cd app
npx prisma generate
```

## Environment variables

See `.env.example` for the full list. The most important:

### Database / Next app

- `DATABASE_URL` (used by Prisma)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` (admin login)

### Analyzer

- `PORT` (default `5051` in docker)
- `VITE_API_URL` (analyzer UI → analyzer API)
- `VITE_LEADS_API_URL` (analyzer UI → Next API, default `http://localhost:3000`)

### External services (optional)

- `GOOGLE_PAGESPEED_API_KEY`
- `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL`
- `YANDEX_STORAGE_*` (image uploads from admin editor)

## Admin URLs

- Admin login: `http://localhost:3000/admin/login`
- Admin posts: `http://localhost:3000/admin/posts`
- Admin leads (mini-CRM): `http://localhost:3000/admin/leads`

## API contracts (summary)

### Leads (Next app)

`POST /api/leads`

```json
{
  "name": "string",
  "contact": "string",
  "websiteUrl": "string | null",
  "analysisText": "string | null",
  "lossesText": "string | null",
  "solutionOfferText": "string | null",
  "siteType": "string | null",
  "hasRepeatSales": "boolean | null",
  "trafficSources": "string | null"
}
```

Returns: created lead row.

`GET /api/leads` → list ordered by `createdAt desc`.

`GET /api/leads/[id]` → one lead.

`PATCH /api/leads/[id]`

```json
{
  "status": "NEW | CONTACTED | WON | LOST",
  "managerComment": "string | null"
}
```

### Analyzer (Express)

See `server/src/app.js` for all routes.

