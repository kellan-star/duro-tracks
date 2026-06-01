import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// SQLite connection (singleton). The database file lives in DATA_DIR, which in
// production points at the Railway persistent volume (e.g. /app/data).
// ---------------------------------------------------------------------------

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, "duro-tracks.db");

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);

  _db = db;
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS calls (
      id            TEXT PRIMARY KEY,
      subject       TEXT,
      start_time    TEXT,
      attendees     TEXT,        -- JSON array of { name, email }
      tracked_reps  TEXT,        -- JSON array of rep names on the call
      domain        TEXT,        -- resolved prospect domain (nullable)
      created_at    TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_calls_domain ON calls(domain);

    CREATE TABLE IF NOT EXISTS transcripts (
      meeting_id  TEXT PRIMARY KEY,
      text        TEXT,
      source      TEXT,          -- 'transcript' | 'notes'
      created_at  TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (meeting_id) REFERENCES calls(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS accounts (
      domain           TEXT PRIMARY KEY,
      company          TEXT,
      lead_rep         TEXT,
      call_count       INTEGER DEFAULT 0,
      transcript_count INTEGER DEFAULT 0,
      last_call        TEXT,
      analysis_dirty   INTEGER DEFAULT 1,   -- 1 = needs (re)analysis
      updated_at       TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS analysis_results (
      domain          TEXT PRIMARY KEY,
      discovery       TEXT,   -- JSON
      value_map       TEXT,   -- JSON
      meddpicc        TEXT,   -- JSON
      discovery_score REAL DEFAULT 0,
      value_map_score REAL DEFAULT 0,
      meddpicc_score  REAL DEFAULT 0,
      source_hash     TEXT,   -- hash of transcript ids used, to detect change
      updated_at      TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (domain) REFERENCES accounts(domain) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS aggregate_insights (
      framework  TEXT PRIMARY KEY,  -- 'discovery' | 'valuemap' | 'meddpicc'
      data       TEXT,              -- JSON
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// ---------------------------------------------------------------------------
// sync_meta helpers
// ---------------------------------------------------------------------------

export function getMeta(key: string): string | null {
  const row = getDb().prepare("SELECT value FROM sync_meta WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setMeta(key: string, value: string): void {
  getDb()
    .prepare(
      `INSERT INTO sync_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(key, value);
}

export function resetDb(): void {
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
