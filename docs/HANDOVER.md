# Duro Tracks — Handover Runbook

Everything a new owner needs to run, operate, and develop Duro Tracks.

Duro Tracks is an internal sales-intelligence dashboard: it pulls sales-call transcripts
from **Avoma**, analyzes them with **Claude (Anthropic)**, stores results in **SQLite**, and
serves a **Next.js** dashboard hosted on **Railway**.

---

## 1. Access to transfer (do these first)

New owner: **[@blakeoc26](https://github.com/blakeoc26)**.

Ask the current owner to grant the new owner access to each of these. Do **not** paste secret
values into chat, email, or the repo — share them through a password manager / secrets vault,
or rotate them (see §7).

| System | What to transfer | Where |
|---|---|---|
| **GitHub** | Write/admin on the `kellan-star/duro-tracks` repository | github.com |
| **Railway** | Member/admin on the Railway project running the app | railway.app |
| **Avoma** | The Avoma API key (or issue a new one for the new owner) | Avoma settings → API |
| **Anthropic** | The Anthropic API key (or issue a new one; put it on the org's billing) | console.anthropic.com |

The production URL is the Railway-generated domain (e.g. `https://duro-tracks-production.up.railway.app`).

---

## 2. Environment variables

All secrets/config live as **Railway service variables** (Project → service → Variables), not
in the repo. The app reads:

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Yes** | Claude API access for all analysis |
| `AVOMA_API_KEY` | **Yes** | Avoma REST API access for ingesting transcripts |
| `ANALYSIS_MODEL` | No | Overrides the per-account extraction model (default: a fast/cheap Claude model) |
| `AGGREGATE_MODEL` | No | Overrides the cross-account synthesis model (default: a stronger Claude model) |
| `ANTHROPIC_MODEL` | No | Sets **both** tiers at once (a single override); leave unset to use the per-tier defaults |
| `BATCH_ANALYSIS` | No | Toggles the Message Batches API path for per-account analysis (on by default) |
| `MAX_DEALS` | No | Caps how many accounts a sync will process — useful for testing on a small set |

Notes:
- The two API keys are the only hard requirements. The rest have sensible defaults.
- If you rotate a key, update it in Railway Variables and redeploy (or trigger a redeploy).

---

## 3. Repository layout

```
src/
  app/
    api/                 # route handlers (all Node runtime, force-dynamic)
      sync/              # POST starts a background sync (202) + GET status
      progress/          # GET sync progress
      export/            # GET CSV of deal-status/account data
      mentions/          # GET keyword mention counts across accounts
      win-reasons/       # win-analysis synthesis for a set of Closed-Won domains
      feature-interest/  # per-account AI-feature / API-support classification
      feature-scan/      # background book-wide 3-signal scan (start + poll)
      aggregate/         # re-run cross-account analysis over stored data
    …                    # dashboard pages/tabs
  lib/
    avoma-client.ts      # Avoma REST client (rate-limited, cached)
    sync-engine.ts       # pipeline: fetch → filter → store → analyze → aggregate
    account-analyzer.ts  # per-account AI analysis (extraction, batch support)
    aggregate-analyzer.ts# cross-account theme synthesis
    db.ts                # SQLite schema, migrations, queries
    tab-queries.ts       # shape DB rows into the dashboard's tab data
    progress.ts          # in-memory sync progress
    types.ts             # shared types (frameworks, deal status, etc.)
  prompts/               # the AI prompt templates (Markdown)
scripts/
  build-win-deck.mjs     # generates the "Why Customers Choose Duro" .pptx
docs/                    # this runbook, etc.
nixpacks.toml            # Railway build/start config
README.md, PRD.md        # product overview + full spec
```

**Tracked reps** (whose calls are ingested) are configured in `src/lib/sync-engine.ts`
(`canonicalRepEmail` matching). To change who is tracked, edit there.

---

## 4. Local development

Prereqs: Node 20+ and npm. `better-sqlite3` compiles natively, so you need build tools
(`python3`, `make`, `g++` — already listed in `nixpacks.toml` for the server).

```bash
git clone https://github.com/kellan-star/duro-tracks.git
cd duro-tracks
npm install

# provide the two keys locally (do NOT commit this file)
cat > .env.local <<'EOF'
ANTHROPIC_API_KEY=sk-ant-...
AVOMA_API_KEY=...
MAX_DEALS=3          # optional: keep test runs small/cheap
EOF

npm run dev          # http://localhost:3000
```

A local SQLite DB is created at `data/duro-tracks.db` (relative to the project root). Trigger a
sync from the dashboard's "Sync Now" button or `curl -X POST localhost:3000/api/sync`.

Useful commands:
```bash
npm run typecheck    # tsc --noEmit
npm run lint
npm run build        # production build
```

---

## 5. Deployment (Railway)

- **Deploy-on-push:** Railway watches the **`main`** branch. Merging to `main` triggers an
  automatic build (`npm ci && npm run build`) and deploy. There is no manual deploy step.
- **Start command:** `node_modules/.bin/next start` (set in `nixpacks.toml`) — run directly so
  a SIGTERM on rolling redeploy exits cleanly instead of being flagged as a crash.
- **Branching:** develop on a feature branch, open a PR into `main`, merge → it deploys.
- Railway deployment IDs are their own UUIDs and are **not** git SHAs — match deploys to code
  by the commit shown in the Railway deploy, not by the deployment ID.

---

## 6. Data & persistence

- The SQLite DB lives at `data/duro-tracks.db`, i.e. **`/app/data/duro-tracks.db`** on Railway.
- A **Railway persistent volume must stay mounted at `/app/data`** so transcripts and analysis
  survive restarts and redeploys. If the volume is removed or remounted elsewhere, the app
  starts with an empty database and must re-sync from Avoma.
- Schema changes are applied as idempotent `ALTER TABLE` migrations against the existing volume
  DB at startup (see `db.ts`), so deploying schema updates does not wipe data.

---

## 7. Operations

**Manual sync:** dashboard "Sync Now" button, or `POST /api/sync`. Add `?force=1` to re-run all
AI analysis even when transcripts are unchanged.

**Automatic sync:** the dashboard runs a browser-driven daily refresh (DST-safe ET timing) when
someone has it open. It is **browser-driven**, so it only fires while the app is open in a
browser — there is no server cron.

**Sync is asynchronous:** `POST /api/sync` returns `202` immediately and the work runs in the
background (a full run can take minutes). Poll `GET /api/sync` and `GET /api/progress` for
status; the UI does this automatically and refreshes tabs on completion.

**Reset the database** (rare — full re-ingest): this is a destructive operation exposed in
`db.ts`; use only if the data is corrupt. After reset, run a `?force=1` sync to rebuild.

**Rotating a key:** issue a new Avoma/Anthropic key, update the Railway Variable, redeploy.
Rotate whenever ownership changes.

---

## 8. On-demand endpoints (for ad-hoc analysis)

All are plain HTTP against the production URL:

- `GET /api/export` — CSV of deal-status/account data.
- `GET /api/mentions?q=TERM` — count of unique accounts whose transcripts mention TERM (`&format=csv`).
- `GET|POST /api/win-reasons?domains=a.com,b.com` — ranked purchase drivers across a set of
  Closed-Won accounts (`&dryRun=1` to preview matched accounts without an AI call).
- `GET|POST /api/feature-interest?domains=…` — per-account AI-feature / API-support interest.
- `POST /api/feature-scan` — start a background book-wide scan (AI features / API support /
  build-your-own-PLM-with-AI). Then `GET /api/feature-scan` to poll; `&details=1` for per-account
  evidence.

---

## 9. Slide-deck generator

`scripts/build-win-deck.mjs` turns win-reasons JSON into the "Why Customers Choose Duro" `.pptx`:

```bash
# save the /api/win-reasons output to win.json, then:
node scripts/build-win-deck.mjs win.json out.pptx
# optional AI/API interest slide from /api/feature-interest output:
FEATURE_JSON=feature.json node scripts/build-win-deck.mjs win.json out.pptx
```
Requires `pptxgenjs` (`npm install pptxgenjs`).

---

## 10. Cost controls (context for anyone tuning spend)

Four mechanisms keep Claude usage down; see `account-analyzer.ts` / `sync-engine.ts`:
1. **Incremental-only** re-analysis, gated on a per-account transcript content hash.
2. **Model tiering** — cheap model for extraction, stronger model for synthesis (`ANALYSIS_MODEL` / `AGGREGATE_MODEL`).
3. **Prompt caching** — the large static system prompt is cached, not re-billed per call.
4. **Batch API** — per-account analyses submitted via the Message Batches API (`BATCH_ANALYSIS`).

---

## 11. Handover checklist

- [ ] @blakeoc26 added to the GitHub repo (`kellan-star/duro-tracks`, write/admin)
- [ ] @blakeoc26 added to the Railway project
- [ ] Avoma API key transferred or reissued, set in Railway Variables
- [ ] Anthropic API key transferred or reissued (on org billing), set in Railway Variables
- [ ] @blakeoc26 can clone, `npm install`, `npm run dev`, and run a `MAX_DEALS`-limited sync locally
- [ ] @blakeoc26 confirmed the Railway persistent volume is mounted at `/app/data`
- [ ] @blakeoc26 did a test merge to `main` and watched it deploy
- [ ] Old keys rotated once @blakeoc26 is set up
- [ ] Walked through this runbook together

---

## 12. Driving the app — operator quick reference

### Where everything lives

| Thing | Location |
|---|---|
| **Call transcripts + AI analysis** | SQLite DB at `/app/data/duro-tracks.db` on the Railway persistent volume (locally: `data/duro-tracks.db`). Transcripts are in the `transcripts` table; per-account analysis in `analysis_results`. |
| **The live app** | The Railway service → its public domain (the production URL) |
| **Source code** | GitHub `kellan-star/duro-tracks`, branch `main` |
| **Ingestion logic** | `src/lib/sync-engine.ts` (+ `src/lib/avoma-client.ts`) |
| **AI analysis logic** | `src/lib/account-analyzer.ts`, `src/lib/aggregate-analyzer.ts` |
| **AI prompts (editable text)** | `src/prompts/*.md` |
| **Secrets / config** | Railway → service → **Variables** (never in the repo) |
| **Build / deploy config** | `nixpacks.toml` |
| **Deploy history + runtime logs** | Railway → service → **Deployments** (build logs) and **Observability / Logs** (runtime) |

### Shipping a change (end to end)

1. Make the change on a feature branch (via Claude Code, or locally).
2. `npm run typecheck && npm run build` to confirm it compiles.
3. Open a PR into `main`, review the diff, merge it.
4. **Railway auto-deploys `main`.** Watch the deploy in Railway → Deployments until it's active.
5. Verify on the production URL.

**Roll back:** either revert the PR on GitHub (creates a new commit → auto-deploys the revert),
or in Railway → Deployments, redeploy the previous good deployment.

### Running things on demand

```bash
BASE=https://<your-railway-domain>

# Sync now (fetch new calls + analyze). Add ?force=1 to re-analyze everything.
curl -X POST "$BASE/api/sync"          # returns 202; then poll:
curl "$BASE/api/sync"                   # {isSyncing, lastSyncAt}
curl "$BASE/api/progress"               # live progress

# Ad-hoc analyses
curl "$BASE/api/export" -o accounts.csv                 # CSV export
curl "$BASE/api/mentions?q=PDM"                         # unique accounts mentioning a term
curl "$BASE/api/win-reasons?domains=a.com,b.com"        # ranked purchase drivers
curl "$BASE/api/feature-interest?domains=a.com,b.com"   # AI / API interest for a set
curl -X POST "$BASE/api/feature-scan"                   # book-wide 3-signal scan (background)
curl "$BASE/api/feature-scan"                           # poll; &details=1 for evidence
```

### Troubleshooting

| Symptom | First thing to check |
|---|---|
| Dashboard is empty / stale | Trigger a sync (`POST /api/sync`); poll `/api/progress`. If still empty, confirm the Railway volume is mounted at `/app/data` (a lost volume = empty DB). |
| Sync never finishes / errors | Read Railway runtime logs. Common causes: Avoma or Anthropic API key invalid/expired, or an upstream rate limit. |
| Every redeploy looks like a "crash" | Expected only if the start command regressed — it must be `node_modules/.bin/next start` (see `nixpacks.toml`), not `npm start`. |
| "No space left on device" | The Railway volume/disk is full — clear old data or grow the volume. Deletes still work when writes fail. |
| A deploy didn't pick up your commit | Confirm the commit is on `main` and the Railway deploy references that SHA (Railway deploy IDs are UUIDs, not git SHAs). |
| Need to know which model is running | Check `ANALYSIS_MODEL` / `AGGREGATE_MODEL` / `ANTHROPIC_MODEL` in Railway Variables; unset = per-tier defaults. |

