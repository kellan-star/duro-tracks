// ---------------------------------------------------------------------------
// Domain types for Duro Tracks
// ---------------------------------------------------------------------------

export type Region = "US" | "EMEA";

export interface TrackedRep {
  name: string;
  /** Lowercased email(s) used to match this rep among meeting attendees. */
  emails: string[];
  region: Region;
}

// ---------------------------------------------------------------------------
// Framework definitions
// ---------------------------------------------------------------------------

/** Account Discovery — 7 questions. */
export const DISCOVERY_QUESTIONS = [
  { key: "companyPriorities", label: "Company Priorities", description: "Business goals the prospect is aiming to achieve" },
  { key: "competitiveEnvironment", label: "Competitive Environment", description: "Non-Duro tools currently in use or being evaluated (e.g., Spreadsheets, Arena, Teamcenter, Oracle Agile)" },
  { key: "urgency", label: "Urgency", description: "Why they need to change now; consequences of inaction" },
  { key: "span", label: "Span", description: "Number of people involved in design, development, production" },
  { key: "financialOperationalImpact", label: "Financial & Operational Impact", description: "Cost of the status quo; compliance risks; delays" },
  { key: "commonBarriers", label: "Common Barriers", description: "Budget limits, workflow resistance, IT/security concerns" },
  { key: "counterStrategy", label: "Counter-Strategy", description: "How the prospect will prove value to internal skeptics" },
] as const;

export type DiscoveryKey = (typeof DISCOVERY_QUESTIONS)[number]["key"];

/** Value Map — one app (PLM) x 3 dimensions = 3 cells. */
export const VALUE_MAP_APPS = ["PLM"] as const;
export type ValueMapApp = (typeof VALUE_MAP_APPS)[number];

export const VALUE_MAP_DIMENSIONS = [
  { key: "persona", label: "Persona" },
  { key: "jobsToBeDone", label: "Jobs To Be Done" },
  { key: "valueUnlocked", label: "Value Unlocked" },
] as const;

export type ValueMapDimension = (typeof VALUE_MAP_DIMENSIONS)[number]["key"];

/** MEDDPICC — 8 categories, with single-letter chip identifiers. */
export const MEDDPICC_CATEGORIES = [
  { key: "metrics", label: "Metrics", letter: "M", description: "KPIs discussed, targets, trends" },
  { key: "economicBuyer", label: "Economic Buyer", letter: "E", description: "Decision-makers and stakeholders" },
  { key: "decisionCriteria", label: "Decision Criteria", letter: "D", description: "Features/requirements driving the decision" },
  { key: "decisionProcess", label: "Decision Process", letter: "D", description: "Steps, milestones, blockers to final decision" },
  { key: "paperProcess", label: "Paper Process", letter: "P", description: "Procurement, legal, contract approval steps" },
  { key: "identifyPain", label: "Identify Pain", letter: "I", description: "Specific hurdles the prospect faces" },
  { key: "champion", label: "Champion", letter: "C", description: "Internal advocate, their role and actions" },
  { key: "competitors", label: "Competitors", letter: "C", description: "Competitor mentions, strengths, weaknesses" },
] as const;

export type MeddpiccKey = (typeof MEDDPICC_CATEGORIES)[number]["key"];

export type Framework = "discovery" | "valuemap" | "meddpicc";

// ---------------------------------------------------------------------------
// Per-account AI analysis result shapes
// ---------------------------------------------------------------------------

export type DiscoveryAnalysis = Record<DiscoveryKey, string>;

export interface ValueMapCell {
  persona: string;
  jobsToBeDone: string;
  valueUnlocked: string;
}
export type ValueMapAnalysis = Record<ValueMapApp, ValueMapCell>;

export type MeddpiccAnalysis = Record<MeddpiccKey, string>;

export interface AccountAnalysis {
  discovery: DiscoveryAnalysis;
  valueMap: ValueMapAnalysis;
  meddpicc: MeddpiccAnalysis;
}

// ---------------------------------------------------------------------------
// Aggregate (cross-account) insight shapes
// ---------------------------------------------------------------------------

export interface AggregateTheme {
  theme: string;
  /** Share of accounts (0-100) where this theme appears. */
  percentage: number;
}

/** Discovery aggregate: themes per question. */
export type DiscoveryInsights = Record<DiscoveryKey, AggregateTheme[]>;

/** Value Map aggregate: themes per (app, dimension). */
export type ValueMapInsights = Record<ValueMapApp, Record<ValueMapDimension, AggregateTheme[]>>;

/** MEDDPICC aggregate: themes per category. */
export type MeddpiccInsights = Record<MeddpiccKey, AggregateTheme[]>;

// ---------------------------------------------------------------------------
// Query-layer view models (what the API routes return)
// ---------------------------------------------------------------------------

export interface CoverageScores {
  discovery: number;
  valueMap: number;
  meddpicc: number;
}

export interface AccountRow {
  domain: string;
  company: string;
  leadRep: string | null;
  region: Region | null;
  callCount: number;
  transcriptCount: number;
  lastCall: string | null;
  scores: CoverageScores;
}

export interface RepRow {
  name: string;
  region: Region;
  callCount: number;
  lastCall: string | null;
  accountCount: number;
  scores: CoverageScores; // averages across the rep's accounts
  active: boolean;
}

export interface CallRecord {
  id: string;
  subject: string;
  startTime: string | null;
  reps: string[];
  attendees: string[];
}

export interface AccountDetail extends AccountRow {
  analysis: AccountAnalysis | null;
  calls: CallRecord[];
}

export interface Kpis {
  accountsTracked: number;
  callTranscripts: number;
  avgCoverage: number;
  activeReps: number;
  totalReps: number;
}
