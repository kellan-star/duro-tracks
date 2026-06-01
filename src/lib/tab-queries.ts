import { getDb } from "./db";
import { TRACKED_REPS } from "./config";
import type {
  AccountAnalysis,
  AccountDetail,
  AccountRow,
  CallRecord,
  DiscoveryInsights,
  Kpis,
  MeddpiccInsights,
  Region,
  RepRow,
  ValueMapInsights,
} from "./types";

interface AccountDbRow {
  domain: string;
  company: string;
  lead_rep: string | null;
  region: string | null;
  call_count: number;
  transcript_count: number;
  last_call: string | null;
  discovery_score: number | null;
  value_map_score: number | null;
  meddpicc_score: number | null;
}

function toAccountRow(r: AccountDbRow): AccountRow {
  return {
    domain: r.domain,
    company: r.company,
    leadRep: r.lead_rep,
    region: (r.region as Region | null) ?? null,
    callCount: r.call_count,
    transcriptCount: r.transcript_count,
    lastCall: r.last_call,
    scores: {
      discovery: r.discovery_score ?? 0,
      valueMap: r.value_map_score ?? 0,
      meddpicc: r.meddpicc_score ?? 0,
    },
  };
}

const ACCOUNT_SELECT = `
  SELECT a.domain, a.company, a.lead_rep, a.region, a.call_count, a.transcript_count, a.last_call,
         r.discovery_score, r.value_map_score, r.meddpicc_score
  FROM accounts a
  LEFT JOIN analysis_results r ON r.domain = a.domain
`;

export function getAccounts(): AccountRow[] {
  const rows = getDb()
    .prepare(`${ACCOUNT_SELECT} ORDER BY a.call_count DESC, a.company ASC`)
    .all() as AccountDbRow[];
  return rows.map(toAccountRow);
}

export function getReps(): RepRow[] {
  const accounts = getAccounts();
  return TRACKED_REPS.map((rep) => {
    const theirs = accounts.filter((a) => a.leadRep === rep.name);
    const callCount = theirs.reduce((s, a) => s + a.callCount, 0);
    const lastCall = theirs.reduce<string | null>(
      (acc, a) => (a.lastCall && (!acc || a.lastCall > acc) ? a.lastCall : acc),
      null,
    );
    const avg = (sel: (a: AccountRow) => number) =>
      theirs.length ? Math.round(theirs.reduce((s, a) => s + sel(a), 0) / theirs.length) : 0;

    return {
      name: rep.name,
      region: rep.region,
      callCount,
      lastCall,
      accountCount: theirs.length,
      scores: {
        discovery: avg((a) => a.scores.discovery),
        valueMap: avg((a) => a.scores.valueMap),
        meddpicc: avg((a) => a.scores.meddpicc),
      },
      active: callCount > 0,
    };
  });
}

export function getKpis(): Kpis {
  const db = getDb();
  const accountsTracked =
    (db.prepare("SELECT COUNT(*) AS n FROM accounts").get() as { n: number }).n ?? 0;
  const callTranscripts =
    (db.prepare("SELECT COUNT(*) AS n FROM transcripts").get() as { n: number }).n ?? 0;

  const scoreRows = db
    .prepare("SELECT discovery_score, value_map_score, meddpicc_score FROM analysis_results")
    .all() as { discovery_score: number; value_map_score: number; meddpicc_score: number }[];
  let avgCoverage = 0;
  if (scoreRows.length) {
    const total = scoreRows.reduce(
      (s, r) => s + (r.discovery_score + r.value_map_score + r.meddpicc_score) / 3,
      0,
    );
    avgCoverage = Math.round(total / scoreRows.length);
  }

  const reps = getReps();
  return {
    accountsTracked,
    callTranscripts,
    avgCoverage,
    activeReps: reps.filter((r) => r.active).length,
    totalReps: TRACKED_REPS.length,
  };
}

export function getAccountDetail(domain: string): AccountDetail | null {
  const db = getDb();
  const row = db
    .prepare(`${ACCOUNT_SELECT} WHERE a.domain = ?`)
    .get(domain) as AccountDbRow | undefined;
  if (!row) return null;

  const analysisRow = db
    .prepare("SELECT discovery, value_map, meddpicc FROM analysis_results WHERE domain = ?")
    .get(domain) as { discovery: string; value_map: string; meddpicc: string } | undefined;

  const analysis: AccountAnalysis | null = analysisRow
    ? {
        discovery: JSON.parse(analysisRow.discovery),
        valueMap: JSON.parse(analysisRow.value_map),
        meddpicc: JSON.parse(analysisRow.meddpicc),
      }
    : null;

  const callRows = db
    .prepare(
      "SELECT id, subject, start_time, attendees, tracked_reps FROM calls WHERE domain = ? ORDER BY start_time DESC",
    )
    .all(domain) as {
    id: string;
    subject: string;
    start_time: string | null;
    attendees: string;
    tracked_reps: string;
  }[];

  const calls: CallRecord[] = callRows.map((c) => ({
    id: c.id,
    subject: c.subject,
    startTime: c.start_time,
    reps: JSON.parse(c.tracked_reps) as string[],
    attendees: (JSON.parse(c.attendees) as { name: string; email: string }[]).map(
      (a) => a.name || a.email,
    ),
  }));

  return { ...toAccountRow(row), analysis, calls };
}

function getInsights<T>(framework: string, fallback: T): T {
  const row = getDb()
    .prepare("SELECT data FROM aggregate_insights WHERE framework = ?")
    .get(framework) as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as T) : fallback;
}

export function getDiscoveryInsights(): DiscoveryInsights {
  return getInsights<DiscoveryInsights>("discovery", {} as DiscoveryInsights);
}
export function getValueMapInsights(): ValueMapInsights {
  return getInsights<ValueMapInsights>("valuemap", {} as ValueMapInsights);
}
export function getMeddpiccInsights(): MeddpiccInsights {
  return getInsights<MeddpiccInsights>("meddpicc", {} as MeddpiccInsights);
}
