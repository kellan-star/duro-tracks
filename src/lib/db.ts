import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { join } from "path";

const DB_PATH = join(process.cwd(), "data", "duro-tracks.db");

declare global {
  // eslint-disable-next-line no-var
  var __duroTracksDb: Database.Database | undefined;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS calls (
      meeting_uuid TEXT PRIMARY KEY,
      subject TEXT,
      start_at TEXT,
      organizer_email TEXT,
      attendees_json TEXT NOT NULL,
      account_domain TEXT,
      tracked_rep_emails_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transcripts (
      meeting_uuid TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'transcript',
      fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS accounts (
      domain TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      lead_rep_email TEXT,
      first_call_date TEXT,
      last_call_date TEXT,
      call_count INTEGER NOT NULL DEFAULT 0,
      transcript_count INTEGER NOT NULL DEFAULT 0,
      needs_reanalysis INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS analysis_results (
      account_domain TEXT PRIMARY KEY,
      account_discovery_json TEXT,
      value_map_json TEXT,
      meddpicc_json TEXT,
      transcript_hash TEXT,
      analyzed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS aggregate_insights (
      framework TEXT PRIMARY KEY,
      result_json TEXT NOT NULL,
      account_count INTEGER NOT NULL DEFAULT 0,
      analyzed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_calls_account ON calls(account_domain);
    CREATE INDEX IF NOT EXISTS idx_calls_start ON calls(start_at);
  `);
}

export function getDb(): Database.Database {
  if (globalThis.__duroTracksDb) return globalThis.__duroTracksDb;

  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  globalThis.__duroTracksDb = db;
  return db;
}

// --- Sync Meta ---

export function getLastSyncTimestamp(): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM sync_meta WHERE key = ?")
    .get("last_sync_at") as { value: string } | undefined;
  return row?.value ?? null;
}

export function setLastSyncTimestamp(ts: string): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO sync_meta (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run("last_sync_at", ts);
}

// --- Calls ---

export function upsertCall(call: {
  meetingUuid: string;
  subject: string;
  startAt: string;
  organizerEmail: string;
  attendeesJson: string;
  accountDomain: string | null;
  trackedRepEmailsJson: string;
}): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO calls (meeting_uuid, subject, start_at, organizer_email, attendees_json, account_domain, tracked_rep_emails_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(meeting_uuid) DO UPDATE SET
       account_domain = excluded.account_domain,
       tracked_rep_emails_json = excluded.tracked_rep_emails_json`
  ).run(
    call.meetingUuid,
    call.subject,
    call.startAt,
    call.organizerEmail,
    call.attendeesJson,
    call.accountDomain,
    call.trackedRepEmailsJson
  );
}

export function callExists(meetingUuid: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT 1 FROM calls WHERE meeting_uuid = ?")
    .get(meetingUuid);
  return !!row;
}

// --- Transcripts ---

export function getCallsMissingTranscripts(): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.meeting_uuid FROM calls c
       LEFT JOIN transcripts t ON t.meeting_uuid = c.meeting_uuid
       WHERE t.meeting_uuid IS NULL AND c.account_domain IS NOT NULL`
    )
    .all() as Array<{ meeting_uuid: string }>;
  return rows.map((r) => r.meeting_uuid);
}

export function upsertTranscript(
  meetingUuid: string,
  content: string,
  source: "transcript" | "notes"
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO transcripts (meeting_uuid, content, source, fetched_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(meeting_uuid) DO UPDATE SET
       content = excluded.content, source = excluded.source, fetched_at = excluded.fetched_at`
  ).run(meetingUuid, content, source);
}

export function transcriptExists(meetingUuid: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT 1 FROM transcripts WHERE meeting_uuid = ?")
    .get(meetingUuid);
  return !!row;
}

export function getTranscriptsForAccount(domain: string): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT t.content FROM transcripts t
       JOIN calls c ON c.meeting_uuid = t.meeting_uuid
       WHERE c.account_domain = ?
       ORDER BY c.start_at ASC`
    )
    .all(domain) as Array<{ content: string }>;
  return rows.map((r) => r.content);
}

// --- Accounts ---

export function upsertAccount(acct: {
  domain: string;
  companyName: string;
  leadRepEmail: string | null;
  firstCallDate: string;
  lastCallDate: string;
  callCount: number;
  transcriptCount: number;
}): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO accounts (domain, company_name, lead_rep_email, first_call_date, last_call_date, call_count, transcript_count, needs_reanalysis, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
     ON CONFLICT(domain) DO UPDATE SET
       company_name = excluded.company_name,
       lead_rep_email = excluded.lead_rep_email,
       first_call_date = excluded.first_call_date,
       last_call_date = excluded.last_call_date,
       call_count = excluded.call_count,
       transcript_count = excluded.transcript_count,
       needs_reanalysis = 1,
       updated_at = excluded.updated_at`
  ).run(
    acct.domain,
    acct.companyName,
    acct.leadRepEmail,
    acct.firstCallDate,
    acct.lastCallDate,
    acct.callCount,
    acct.transcriptCount
  );
}

export function markAccountAnalyzed(domain: string): void {
  const db = getDb();
  db.prepare("UPDATE accounts SET needs_reanalysis = 0 WHERE domain = ?").run(
    domain
  );
}

export function getAccountsNeedingAnalysis(): string[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT domain FROM accounts WHERE needs_reanalysis = 1")
    .all() as Array<{ domain: string }>;
  return rows.map((r) => r.domain);
}

// --- Analysis Results ---

export function saveAnalysis(
  domain: string,
  accountDiscoveryJson: string,
  valueMapJson: string,
  meddpiccJson: string,
  transcriptHash: string
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO analysis_results (account_domain, account_discovery_json, value_map_json, meddpicc_json, transcript_hash, analyzed_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(account_domain) DO UPDATE SET
       account_discovery_json = excluded.account_discovery_json,
       value_map_json = excluded.value_map_json,
       meddpicc_json = excluded.meddpicc_json,
       transcript_hash = excluded.transcript_hash,
       analyzed_at = excluded.analyzed_at`
  ).run(domain, accountDiscoveryJson, valueMapJson, meddpiccJson, transcriptHash);
}

export function getAnalysisHash(domain: string): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT transcript_hash FROM analysis_results WHERE account_domain = ?")
    .get(domain) as { transcript_hash: string } | undefined;
  return row?.transcript_hash ?? null;
}

// --- Queries for tabs ---

export interface AccountRow {
  domain: string;
  company_name: string;
  lead_rep_email: string | null;
  first_call_date: string;
  last_call_date: string;
  call_count: number;
  transcript_count: number;
  account_discovery_json: string | null;
  value_map_json: string | null;
  meddpicc_json: string | null;
}

export function getAllAccountRows(): AccountRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT a.domain, a.company_name, a.lead_rep_email,
              a.first_call_date, a.last_call_date, a.call_count, a.transcript_count,
              ar.account_discovery_json, ar.value_map_json, ar.meddpicc_json
       FROM accounts a
       LEFT JOIN analysis_results ar ON ar.account_domain = a.domain
       ORDER BY a.last_call_date DESC`
    )
    .all() as AccountRow[];
}

export function getAccountRow(domain: string): AccountRow | undefined {
  const db = getDb();
  return db
    .prepare(
      `SELECT a.domain, a.company_name, a.lead_rep_email,
              a.first_call_date, a.last_call_date, a.call_count, a.transcript_count,
              ar.account_discovery_json, ar.value_map_json, ar.meddpicc_json
       FROM accounts a
       LEFT JOIN analysis_results ar ON ar.account_domain = a.domain
       WHERE a.domain = ?`
    )
    .get(domain) as AccountRow | undefined;
}

export interface CallRow {
  meeting_uuid: string;
  subject: string;
  start_at: string;
  tracked_rep_emails_json: string;
}

export function getCallsForAccount(domain: string): CallRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT meeting_uuid, subject, start_at, tracked_rep_emails_json
       FROM calls WHERE account_domain = ? ORDER BY start_at DESC`
    )
    .all(domain) as CallRow[];
}

export function getRepTranscriptCounts(): Array<{
  rep_email: string;
  transcript_count: number;
  last_meeting: string;
}> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.tracked_rep_emails_json, c.start_at FROM calls c
       INNER JOIN transcripts t ON t.meeting_uuid = c.meeting_uuid
       WHERE c.tracked_rep_emails_json IS NOT NULL AND c.tracked_rep_emails_json != '[]'`
    )
    .all() as Array<{ tracked_rep_emails_json: string; start_at: string }>;

  const counts = new Map<string, { count: number; lastMeeting: string }>();
  for (const row of rows) {
    const emails = JSON.parse(row.tracked_rep_emails_json) as string[];
    for (const email of emails) {
      const existing = counts.get(email);
      if (!existing) {
        counts.set(email, { count: 1, lastMeeting: row.start_at });
      } else {
        existing.count++;
        if (row.start_at > existing.lastMeeting) existing.lastMeeting = row.start_at;
      }
    }
  }

  return Array.from(counts.entries()).map(([email, data]) => ({
    rep_email: email,
    transcript_count: data.count,
    last_meeting: data.lastMeeting,
  }));
}

export function getRepAccountDomains(repEmail: string): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT account_domain FROM calls
       WHERE tracked_rep_emails_json LIKE ? AND account_domain IS NOT NULL`
    )
    .all(`%${repEmail}%`) as Array<{ account_domain: string }>;
  return rows.map((r) => r.account_domain);
}

export function getTotalTranscripts(): number {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as cnt FROM transcripts").get() as {
    cnt: number;
  };
  return row.cnt;
}

// --- Aggregate Insights ---

export function saveAggregateInsight(
  framework: string,
  resultJson: string,
  accountCount: number
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO aggregate_insights (framework, result_json, account_count, analyzed_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(framework) DO UPDATE SET
       result_json = excluded.result_json,
       account_count = excluded.account_count,
       analyzed_at = excluded.analyzed_at`
  ).run(framework, resultJson, accountCount);
}

export function getAggregateInsight(
  framework: string
): { result_json: string; account_count: number; analyzed_at: string } | null {
  const db = getDb();
  const row = db
    .prepare("SELECT result_json, account_count, analyzed_at FROM aggregate_insights WHERE framework = ?")
    .get(framework) as { result_json: string; account_count: number; analyzed_at: string } | undefined;
  return row ?? null;
}

// --- Reset ---

export function resetDatabase(): void {
  const db = getDb();
  db.exec(`
    DELETE FROM aggregate_insights;
    DELETE FROM analysis_results;
    DELETE FROM transcripts;
    DELETE FROM calls;
    DELETE FROM accounts;
    DELETE FROM sync_meta;
  `);
}

// --- Sync Lock ---

let syncing = false;

export function isSyncing(): boolean {
  return syncing;
}

export function setSyncing(v: boolean): void {
  syncing = v;
}
