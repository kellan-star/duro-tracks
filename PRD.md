# Duro Tracks — Product Requirements Document

## Overview

Duro Tracks is a sales call analysis dashboard that aggregates call transcripts
from Avoma, applies AI analysis across three sales qualification frameworks, and
surfaces cross-account insights for sales leadership. The application tracks the
Duro sales reps across US and EMEA regions, analyzing their prospect calls to
measure deal qualification coverage and identify patterns across the book of
business.

## Business Context

Duro is a cloud-native product lifecycle management (PLM) platform for
engineering-led hardware companies. It centralizes the bill of materials, change
orders, sourcing data, revision history, and supplier integrations into a single
system of record — letting multidisciplinary teams (mechanical, electrical,
firmware, supply chain, manufacturing) collaborate on product data without
spreadsheets, shared drives, or the multi-month rollouts that legacy PLM
typically requires. Duro's ideal customer profile centers on venture-backed
deep-tech and mid-market hardware companies in industries like Aerospace and
Defense, Space and Satellite, Robotics, Industrial Automation, EV and Energy,
and Sensors — the "complex electromechanical" segment where engineering velocity
matters and where regulated-PLM enterprise tools are overkill. The SMB sweet
spot is 10–75-employee companies with 5–30 engineers; the broader mid-market ICP
extends up to 1,000-employee organizations with a multidisciplinary engineering
team that needs a single source of truth across the product lifecycle.

Duro positions against legacy PLM (Arena, Teamcenter, Propel, Upchain) on speed,
manageability, and modern UX. A widely-cited customer benchmark shows a change
order taking 7 clicks in Duro versus 35 in Arena; rollout is "up and running in a
day," compared with the six-month implementations and dedicated administrators
that traditional PLM typically requires. First-party CAD integrations to
SolidWorks, Onshape, NX, and Altium Designer are a major differentiator —
competitor integrations are often third-party — and the platform extends into
supplier data via Octopart and SiliconExpert, ERP via NetSuite, and MES via First
Resonance, Tulip, and Stoke Fusion. Duro has roughly 100 customers across 10
countries with named logos including Garmin, Kodiak, Orbit Fab, Gilmour Space,
Rapid Robotics, and Muon Space, and earned G2 Winter 2025 awards for Best ROI,
Fastest Implementation, and Easiest Admin. Following its recent acquisition by
Altium (a Renesas subsidiary), Duro is being integrated into Altium's broader
Agile Teams platform, where it will serve as the system of record for hardware
product information across the lifecycle.

## Problem Statement

Sales leadership lacks visibility into the quality and depth of discovery and
qualification happening across rep calls. Individual call notes exist in Avoma,
but there is no aggregated view that reveals:

- How thoroughly reps are qualifying deals across standard frameworks
- Common themes and patterns across all prospect accounts
- Which problems and solutions are being discussed and by whom
- Gaps in qualification coverage by rep or account
- How effectively reps are positioning Duro

## Data Source

**Avoma** — All data originates from the Avoma meeting platform via REST API.

- **Meetings:** Fetched for the past 90 days, filtered to calls involving tracked reps
- **Transcripts (primary):** Raw call transcription text pulled via `/v1/transcriptions/`
- **Notes (fallback):** If no transcript is available, meeting notes are used instead
- **Storage:** All transcripts are stored locally in SQLite to reduce Avoma API dependency and enable incremental updates

### Filtering Rules

A call is included only if:

- At least one tracked sales rep is an attendee
- At least one external (non-Durolabs, non-Altium, non-Renesas) attendee is present
- No more than 1 Duro rep is on the call (Blake O'Connor or Reese Fairchild) — this filters out team training sessions

### Prospect Grouping

Prospects are identified by external attendee email domain. Personal email
domains (gmail.com, yahoo.com, etc.) are excluded. Each unique corporate domain
becomes an "account" in the system.

### Tracked Sales Reps (2)

| Duro Team |
| --- |
| Blake O'Connor |
| Reese Fairchild |

The Lead Rep for each account is determined by which tracked rep appears on the
most calls for that account.

## Three Analysis Frameworks

All frameworks are analyzed by Claude AI (Sonnet) in a single API call per
account, using the full concatenated transcript text.

### 1. Account Discovery (7 questions)

| Question | Description |
| --- | --- |
| Company Priorities | Business goals the prospect is aiming to achieve |
| Competitive Environment | Non-Duro tools currently in use or being evaluated (e.g., Spreadsheets, Arena, Teamcenter, Oracle Agile) |
| Urgency | Why they need to change now; consequences of inaction |
| Span | Number of people involved in design, development, production |
| Financial & Operational Impact | Cost of the status quo; compliance risks; delays |
| Common Barriers | Budget limits, workflow resistance, IT/security concerns |
| Counter-Strategy | How the prospect will prove value to internal skeptics |

**Score:** Percentage of 7 questions with non-empty responses (e.g., 5/7 = 71%)

### 2. Value Map (1 app × 3 dimensions = 3 cells)

| App / Portal | Persona | Jobs To Be Done | Value Unlocked |
| --- | --- | --- | --- |
| PLM | " | " | " |

**Score:** Percentage of 3 cells with non-empty responses

### 3. MEDDPICC (8 categories)

| Category | Description |
| --- | --- |
| Metrics | KPIs discussed, targets, trends |
| Economic Buyer | Decision-makers and stakeholders |
| Decision Criteria | Features/requirements driving the decision |
| Decision Process | Steps, milestones, blockers to final decision |
| Paper Process | Procurement, legal, contract approval steps |
| Identify Pain | Specific hurdles the prospect faces |
| Champion | Internal advocate, their role and actions |
| Competitors | Competitor mentions, strengths, weaknesses |

**Score:** Percentage of 8 categories with non-empty responses

## Application Pages

### Tab 1: Accounts

Single source of truth for account coverage. Sortable data table with columns:
Company (with colored initial avatar), Domain, Lead Rep, Region (US / EMEA tag),
Calls (count), Last call (date), Account Discovery (coverage % pill), Value Map
(coverage % pill), MEDDPICC (coverage % pill), View → (link to account detail
page).

### Tab 2: Sales Reps

Activity and qualification coverage per rep: Rep name (with initials avatar;
"Inactive" badge if 0 calls), Region, Calls (count), Last call (date), Accounts
(count), Account Discovery (avg %), Value Map (avg %), MEDDPICC (avg %).

### Tab 3: Account Discovery (Cross-Account Insights)

AI-generated aggregate analysis across all accounts for each of the 7 Account
Discovery questions. Each section displays identified themes/patterns and the
percentage of accounts where each theme appears. Only items mentioned by 30%+ of
accounts are shown.

### Tab 4: Value Map (Cross-Account Insights)

4-column grid layout (App/Portal × Persona / Jobs To Be Done / Value Unlocked)
showing AI-generated aggregate themes grounded in actual customer commentary.
Each cell shows themes with account percentages, filtered to a 30%+ threshold.

### Tab 5: MEDDPICC (Cross-Account Insights)

AI-generated aggregate analysis across all accounts for each of the 8 MEDDPICC
categories, with letter-chip identifiers (M-E-D-D-P-I-C-C). Same 30% threshold
filtering as Account Discovery.

### Account Detail Page (`/accounts/[domain]`)

Per-account deep dive accessed via "View →" from the Accounts table. Displays the
account header (company name, domain, lead rep, region, call count, transcript
count, coverage scores), the Account Discovery section (7 Q&A cards), the Value
Map section (1×3 grid), the MEDDPICC section (8 category cards), and the Call
History table (date, subject, reps on each call).

## KPI Strip

Persistent strip below the tab navigation showing 4 real-time metrics:

| KPI | Description |
| --- | --- |
| Accounts tracked | Total account count |
| Call transcripts | Total transcripts stored |
| Avg coverage | Average of AD + VM + MP scores across all accounts |
| Active reps | Count of reps with at least 1 call (out of 2) |

## Sync Behavior

- **Manual Sync:** "Sync now" button in the header triggers a full sync cycle, with a rotating refresh icon and "Syncing…" label.
- **Auto-Refresh:** 24-hr automatic sync (at 6am ET) when the dashboard is open in a browser.
- **Incremental Updates:** Only new meetings since the last sync are fetched; only accounts with new transcripts are re-analyzed; aggregate analysis re-runs only when individual account analyses change.

### Sync Pipeline

1. Fetch meetings from Avoma (past 90 days on first sync, incremental after)
2. Filter by tracked reps, external attendees, and training call rules
3. Fetch transcript (primary) or notes (fallback) for each new meeting
4. Store in SQLite
5. Resolve prospect domains and update account records
6. Run per-account AI analysis (Claude Sonnet) for changed accounts
7. Run aggregate AI analysis (3 calls) for cross-account insights
8. Update sync timestamp

## Technical Architecture

| Component | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | CSS custom properties + Tailwind CSS 4 |
| Font | Inter (400/500/600/700) |
| Database | SQLite via better-sqlite3 |
| AI | Claude Sonnet (Anthropic SDK) |
| Data source | Avoma REST API |
| Client state | SWR for data fetching |
| Hosting | Railway (persistent volume for SQLite) |
| Auth | Client-side passcode gate |

### Rate Limits

- Avoma API: 60 requests/minute (token bucket)
- Anthropic API: 5 requests/minute (~13 second gap between calls)

### Database Tables

- `sync_meta` — last sync timestamp
- `calls` — meeting metadata and attendee lists
- `transcripts` — raw transcript/notes text per meeting
- `accounts` — one row per prospect domain with aggregated metadata
- `analysis_results` — per-account AI analysis (3 frameworks as JSON)
- `aggregate_insights` — cross-account AI analysis per framework

### Coverage Score Color Bands

| Band | Range | Color |
| --- | --- | --- |
| Green | ≥75% | `#047857` on `#ECFDF5` |
| Amber | 26–74% | `#B45309` on `#FFFBEB` |
| Red | 1–25% | `#B91C1C` on `#FEF2F2` |
| Gray | 0% | `#A1A1AA` on `#F4F4F5` |

### Environment Variables

| Variable | Purpose |
| --- | --- |
| `AVOMA_API_KEY` | Avoma REST API authentication |
| `ANTHROPIC_API_KEY` | Claude AI API authentication |
| `MAX_DEALS` | Limit accounts processed (0 = unlimited) |
| `PORT` | Server port (set by Railway, default 8080) |

### Admin Endpoints

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/sync` | POST | Trigger manual sync |
| `/api/sync` | GET | Check sync status |
| `/api/reset` | POST | Clear all database tables |
| `/api/progress` | GET | Poll sync progress |
