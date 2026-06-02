# Duro Tracks

Sales call analysis dashboard for the Duro sales team. It pulls call transcripts
from Avoma, runs Claude (Sonnet) analysis across three sales qualification
frameworks — Account Discovery, Value Map, and MEDDPICC — and surfaces
cross-account insights for sales leadership.

Forked from the Tiger Tracks dashboard and re-skinned for Duro: a single PLM
Value Map product, the Duro sales team (Blake O'Connor, Reese Fairchild), and
Duro's PLM seller context in the AI prompts.

See [`PRD.md`](./PRD.md) for the full product spec.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 (+ CSS custom properties) ·
SQLite (better-sqlite3) · Anthropic SDK (Claude Sonnet) · SWR.

## Architecture — sync-then-query

`POST /api/sync` does all the work: fetch meetings from Avoma → filter → store
transcripts in SQLite → per-account AI analysis → cross-account aggregate
analysis. Every `GET /api/*` route is then an instant SQLite read, consumed in
the UI through SWR hooks.

```
Avoma REST API
   │  sync-engine.ts  (fetch + filter + store, with rate limiting & caching)
   ▼
SQLite (db.ts)
   │  account-analyzer.ts   → per-account JSON (3 frameworks)
   │  aggregate-analyzer.ts → cross-account themes (3 calls)
   ▼
tab-queries.ts ──► /api/* ──► hooks (SWR) ──► React components
```

Key files:

- `src/lib/sync-engine.ts` — pipeline + filtering rules + progress
- `src/lib/avoma-client.ts` — Avoma REST client (rate-limited, cached)
- `src/lib/account-analyzer.ts` / `src/lib/aggregate-analyzer.ts` — Claude calls
- `src/lib/tab-queries.ts` — read/query layer
- `src/lib/db.ts` — SQLite schema + access
- `src/lib/types.ts` — frameworks, tracked reps, internal domains, scoring
- `src/prompts/*.md` — AI prompts

## Filtering rules

A call is included only if: at least one tracked rep is an attendee, at least
one external (non-Durolabs / non-Altium / non-Renesas) attendee is present, and
**no more than one** Duro rep (Blake or Reese) is on the call (so team/training
sessions are dropped). Prospects are grouped by external corporate email domain;
personal domains (gmail, etc.) are excluded.

> Reps may join under more than one address. `TRACKED_REPS` in
> `src/lib/types.ts` lists each rep's aliases (e.g. `blake@durolabs.co` +
> `blake.oconnor@altium.com`); all aliases are matched and collapsed to a single
> canonical key. Confirm these against the reps' real Avoma logins.

## Local development

```bash
npm install
cp .env.example .env   # fill in AVOMA_API_KEY and ANTHROPIC_API_KEY
npm run dev            # http://localhost:3000
```

The default passcode gate is `0526` (see `src/components/auth/PasscodeGate.tsx`).
Without API keys the app still builds and runs — the dashboard renders empty;
`POST /api/sync` will error on the missing Avoma key. Click **Sync now** (or
`curl -XPOST localhost:3000/api/sync`) to populate the database, and poll
`GET /api/progress` for status.

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run start` — start production server (`$PORT`, default 3000)
- `npm run typecheck` — `tsc --noEmit`

## Admin endpoints

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/sync` | POST | Trigger a sync |
| `/api/sync` | GET | Sync status (`lastSyncAt`, `isSyncing`) |
| `/api/progress` | GET | Poll sync progress |
| `/api/reset` | POST | Clear all database tables |

## Deployment (Railway)

`nixpacks.toml` installs the native-module build deps for `better-sqlite3`.
Mount a persistent volume at `/app/data` so the SQLite file
(`data/duro-tracks.db`, relative to the app's working directory) survives
deploys. Set `AVOMA_API_KEY`, `ANTHROPIC_API_KEY`, and optionally
`ANTHROPIC_MODEL` / `MAX_DEALS`.
