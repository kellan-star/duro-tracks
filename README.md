# Duro Tracks

Sales call analysis dashboard for the Duro sales team. It pulls call transcripts
from Avoma, runs AI analysis across three sales qualification frameworks
(Account Discovery, Value Map, MEDDPICC), and surfaces cross-account insights for
sales leadership.

See [`PRD.md`](./PRD.md) for the full product spec.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · SQLite (better-sqlite3) ·
Anthropic SDK (Claude Sonnet) · SWR.

## Architecture

**Sync-then-query.** `POST /api/sync` does all the work — fetch from Avoma →
filter → store transcripts in SQLite → per-account AI analysis → cross-account
aggregate analysis. Every `GET /api/*` route is then an instant SQLite read, and
the UI reads those through SWR hooks.

```
Avoma REST API
   │  (sync-engine.ts: fetch + filter + store)
   ▼
SQLite (db.ts)
   │  (account-analyzer.ts → per-account JSON; aggregate-analyzer.ts → cross-account)
   ▼
tab-queries.ts ──► /api/* ──► SWR hooks ──► React components
```

Key files:

- `src/lib/sync-engine.ts` — the data pipeline + progress tracking
- `src/lib/account-analyzer.ts` / `src/lib/aggregate-analyzer.ts` — AI calls
- `src/lib/tab-queries.ts` — the read/query layer
- `src/lib/db.ts` — SQLite schema
- `src/lib/types.ts` / `src/lib/config.ts` — frameworks, tracked reps, domains
- `src/prompts/*.md` — AI prompts
- `src/components/shared/` — design-system atoms

## Local development

```bash
npm install
cp .env.example .env   # fill in AVOMA_API_KEY and ANTHROPIC_API_KEY
npm run dev            # http://localhost:3000
```

Without API keys the app still builds and runs — the dashboard renders empty and
`POST /api/sync` reports that keys are missing.

After starting, click **Sync now** (or `curl -XPOST localhost:3000/api/sync`) to
populate the database, then poll `GET /api/progress` for status.

> **Configure before first real sync:** update `TRACKED_REPS` in
> `src/lib/config.ts` with the reps' actual Avoma login emails (and confirm their
> regions). The defaults are placeholders derived from the PRD.

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run start` — start production server on `$PORT` (default 8080)
- `npm run typecheck` — `tsc --noEmit`

## Deployment (Railway)

`nixpacks.toml` provides the native-module build deps for `better-sqlite3`.
Mount a persistent volume and point `DATA_DIR` at it (e.g. `/app/data`) so the
SQLite file survives deploys. Set `AVOMA_API_KEY`, `ANTHROPIC_API_KEY`, and
optionally `MAX_DEALS` / `NEXT_PUBLIC_APP_PASSCODE`.
