// --- Sales Rep Tracking ---

export interface TrackedRep {
  name: string;
  /** Canonical/primary email — the stable key used across the DB. */
  email: string;
  /** Every address this rep may appear under as a meeting attendee. */
  emails: string[];
}

export const TRACKED_REPS: TrackedRep[] = [
  {
    name: "Blake O'Connor",
    email: "blake@durolabs.co",
    emails: ["blake@durolabs.co", "blake.oconnor@altium.com"],
  },
  {
    name: "Reese Fairchild",
    email: "reese@durolabs.co",
    emails: ["reese@durolabs.co", "reese.fairchild@altium.com"],
  },
];

// Every tracked-rep address (lowercased) — used to detect a rep among attendees.
export const TRACKED_REP_EMAILS = new Set(
  TRACKED_REPS.flatMap((r) => r.emails.map((e) => e.toLowerCase()))
);

// Map any rep alias → that rep's canonical/primary email.
const EMAIL_TO_PRIMARY = new Map<string, string>();
for (const rep of TRACKED_REPS) {
  for (const e of rep.emails) EMAIL_TO_PRIMARY.set(e.toLowerCase(), rep.email);
}

/** Returns the rep's canonical email for any of their aliases, else null. */
export function canonicalRepEmail(email: string): string | null {
  return EMAIL_TO_PRIMARY.get(email.toLowerCase()) ?? null;
}

export const INTERNAL_DOMAINS = new Set(["altium.com", "durolabs.co", "renesas.com"]);

export const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "mail.com",
  "protonmail.com",
  "live.com",
  "msn.com",
  "ymail.com",
]);

// --- Account Discovery (7 questions) ---

export interface AccountDiscovery {
  companyPriorities: string;
  competitiveEnvironment: string;
  urgency: string;
  span: string;
  financialImpact: string;
  commonBarriers: string;
  counterStrategy: string;
}

export const ACCOUNT_DISCOVERY_LABELS: Record<keyof AccountDiscovery, string> = {
  companyPriorities: "Company Priorities",
  competitiveEnvironment: "Competitive Environment",
  urgency: "Urgency",
  span: "Span",
  financialImpact: "Financial & Operational Impact",
  commonBarriers: "Common Barriers",
  counterStrategy: "Counter-Strategy",
};

export const ACCOUNT_DISCOVERY_KEYS = Object.keys(
  ACCOUNT_DISCOVERY_LABELS
) as Array<keyof AccountDiscovery>;

// --- Value Map (1 app × 3 columns = 3 cells) ---

export interface ValueMapEntry {
  persona: string;
  jobsToBeDone: string;
  valueUnlocked: string;
}

export interface ValueMap {
  plm: ValueMapEntry;
}

export const VALUE_MAP_APP_LABELS: Record<keyof ValueMap, string> = {
  plm: "PLM",
};

export const VALUE_MAP_APP_KEYS = Object.keys(
  VALUE_MAP_APP_LABELS
) as Array<keyof ValueMap>;

export const VALUE_MAP_COLUMN_LABELS: Record<keyof ValueMapEntry, string> = {
  persona: "Persona",
  jobsToBeDone: "Jobs To Be Done",
  valueUnlocked: "Value Unlocked",
};

export const VALUE_MAP_COLUMN_KEYS = Object.keys(
  VALUE_MAP_COLUMN_LABELS
) as Array<keyof ValueMapEntry>;

export const VALUE_MAP_CELL_COUNT = VALUE_MAP_APP_KEYS.length * VALUE_MAP_COLUMN_KEYS.length;

// --- MEDDPICC (8 categories) ---

export interface Meddpicc {
  metrics: string;
  economicBuyer: string;
  decisionCriteria: string;
  decisionProcess: string;
  paperProcess: string;
  identifyPain: string;
  champion: string;
  competitors: string;
}

export const MEDDPICC_LABELS: Record<keyof Meddpicc, string> = {
  metrics: "Metrics",
  economicBuyer: "Economic Buyer",
  decisionCriteria: "Decision Criteria",
  decisionProcess: "Decision Process",
  paperProcess: "Paper Process",
  identifyPain: "Identify Pain",
  champion: "Champion",
  competitors: "Competitors",
};

export const MEDDPICC_KEYS = Object.keys(MEDDPICC_LABELS) as Array<keyof Meddpicc>;

// --- Combined Analysis Result ---

export interface AnalysisResult {
  accountDiscovery: AccountDiscovery;
  valueMap: ValueMap;
  meddpicc: Meddpicc;
}

// --- Account ---

export interface Account {
  domain: string;
  companyName: string;
  lastCallDate: string;
  firstCallDate: string;
  daysSinceFirstCall: number;
  leadRepName: string;
  leadRepEmail: string;
  callCount: number;
  transcriptCount: number;
  accountDiscovery: AccountDiscovery;
  valueMap: ValueMap;
  meddpicc: Meddpicc;
}

// --- Sales Rep Summary ---

export interface SalesRepSummary {
  name: string;
  email: string;
  callCount: number;
  lastCallDate: string;
  accountCount: number;
  accountDiscoveryScore: number;
  valueMapScore: number;
  meddpiccScore: number;
}

// --- Tab Type ---

export type TabId =
  | "accounts"
  | "salesReps"
  | "accountDiscovery"
  | "valueMap"
  | "meddpicc";

// --- API Response Types ---

export interface AccountsTabData {
  accounts: Account[];
  metadata: {
    totalAccounts: number;
    totalTranscripts: number;
    lastSyncAt: string | null;
    refreshedAt: string;
  };
}

export interface SalesRepsTabData {
  reps: SalesRepSummary[];
}

export interface InsightEntry {
  accountDomain: string;
  companyName: string;
  text: string;
}

export interface Theme {
  label: string;
  body: string;
  pct: number;
}

export interface AggregateSection {
  key: string;
  label: string;
  themes: Theme[];
}

export interface AccountDiscoveryTabData {
  totalAccounts: number;
  totalTranscripts: number;
  analyzedAt: string | null;
  sections: AggregateSection[];
}

export interface ValueMapTabData {
  totalAccounts: number;
  totalTranscripts: number;
  analyzedAt: string | null;
  rows: Array<{
    appKey: keyof ValueMap;
    appLabel: string;
    persona: Theme[];
    jobs: Theme[];
    value: Theme[];
  }>;
}

export interface MeddpiccTabData {
  totalAccounts: number;
  totalTranscripts: number;
  analyzedAt: string | null;
  sections: AggregateSection[];
}

export interface CallRecord {
  meetingUuid: string;
  date: string;
  subject: string;
  reps: string[];
}

export interface AccountDetailData {
  account: Account;
  calls: CallRecord[];
}

export interface SyncStatus {
  lastSyncAt: string | null;
  isSyncing: boolean;
}

// --- Score Helpers ---

const EMPTY_VALUE_MAP_ENTRY: ValueMapEntry = {
  persona: "",
  jobsToBeDone: "",
  valueUnlocked: "",
};

export const EMPTY_ACCOUNT_DISCOVERY: AccountDiscovery = {
  companyPriorities: "",
  competitiveEnvironment: "",
  urgency: "",
  span: "",
  financialImpact: "",
  commonBarriers: "",
  counterStrategy: "",
};

export const EMPTY_VALUE_MAP: ValueMap = {
  plm: { ...EMPTY_VALUE_MAP_ENTRY },
};

export const EMPTY_MEDDPICC: Meddpicc = {
  metrics: "",
  economicBuyer: "",
  decisionCriteria: "",
  decisionProcess: "",
  paperProcess: "",
  identifyPain: "",
  champion: "",
  competitors: "",
};

export function accountDiscoveryScore(ad: AccountDiscovery): number {
  const filled = ACCOUNT_DISCOVERY_KEYS.filter((k) => ad[k].trim()).length;
  return Math.round((filled / ACCOUNT_DISCOVERY_KEYS.length) * 100);
}

export function valueMapScore(vm: ValueMap): number {
  let filled = 0;
  for (const appKey of VALUE_MAP_APP_KEYS) {
    for (const colKey of VALUE_MAP_COLUMN_KEYS) {
      if (vm[appKey][colKey].trim()) filled++;
    }
  }
  return Math.round((filled / VALUE_MAP_CELL_COUNT) * 100);
}

export function meddpiccScore(mp: Meddpicc): number {
  const filled = MEDDPICC_KEYS.filter((k) => mp[k].trim()).length;
  return Math.round((filled / MEDDPICC_KEYS.length) * 100);
}
