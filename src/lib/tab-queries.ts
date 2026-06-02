import {
  getAllAccountRows,
  getAccountRow,
  getCallsForAccount,
  getRepTranscriptCounts,
  getRepAccountDomains,
  getTotalTranscripts,
  getAnalyzedAccountCount,
  getLastSyncTimestamp,
  getAggregateInsight,
  type AccountRow,
} from "./db";
import {
  type Account,
  type AccountsTabData,
  type SalesRepsTabData,
  type SalesRepSummary,
  type AccountDiscoveryTabData,
  type ValueMapTabData,
  type MeddpiccTabData,
  type AccountDetailData,
  type AggregateSection,
  type Theme,
  type AccountDiscovery,
  type ValueMap,
  type Meddpicc,
  type CallRecord,
  TRACKED_REPS,
  EMPTY_ACCOUNT_DISCOVERY,
  EMPTY_VALUE_MAP,
  EMPTY_MEDDPICC,
  ACCOUNT_DISCOVERY_KEYS,
  ACCOUNT_DISCOVERY_LABELS,
  VALUE_MAP_APP_KEYS,
  VALUE_MAP_APP_LABELS,
  VALUE_MAP_COLUMN_KEYS,
  MEDDPICC_KEYS,
  MEDDPICC_LABELS,
  accountDiscoveryScore,
  valueMapScore,
  meddpiccScore,
} from "./types";

function parseJson<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

function rowToAccount(row: AccountRow): Account {
  const ad = parseJson<AccountDiscovery>(row.account_discovery_json, { ...EMPTY_ACCOUNT_DISCOVERY });
  const vm = parseJson<ValueMap>(row.value_map_json, JSON.parse(JSON.stringify(EMPTY_VALUE_MAP)));
  const mp = parseJson<Meddpicc>(row.meddpicc_json, { ...EMPTY_MEDDPICC });

  const leadRep = row.lead_rep_email
    ? TRACKED_REPS.find((r) => r.email === row.lead_rep_email)
    : null;

  const firstDate = new Date(row.first_call_date);
  const daysSince = Math.floor(
    (Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    domain: row.domain,
    companyName: row.company_name,
    lastCallDate: row.last_call_date,
    firstCallDate: row.first_call_date,
    daysSinceFirstCall: daysSince,
    leadRepName: leadRep?.name || row.lead_rep_email || "",
    leadRepEmail: row.lead_rep_email || "",
    callCount: row.call_count,
    transcriptCount: row.transcript_count,
    accountDiscovery: ad,
    valueMap: vm,
    meddpicc: mp,
  };
}

export function queryAccountsTab(): AccountsTabData {
  const rows = getAllAccountRows();
  const accounts = rows.map(rowToAccount);
  return {
    accounts,
    metadata: {
      totalAccounts: accounts.length,
      totalTranscripts: getTotalTranscripts(),
      totalAnalyzed: getAnalyzedAccountCount(),
      lastSyncAt: getLastSyncTimestamp(),
      refreshedAt: new Date().toISOString(),
    },
  };
}

export function querySalesRepsTab(): SalesRepsTabData {
  const repTranscripts = getRepTranscriptCounts();
  const accountRows = getAllAccountRows();
  const accounts = accountRows.map(rowToAccount);

  const reps: SalesRepSummary[] = TRACKED_REPS.map((rep) => {
    const repData = repTranscripts.find((rc) => rc.rep_email === rep.email);
    const accountDomains = getRepAccountDomains(rep.email);
    const repAccounts = accounts.filter((a) => accountDomains.includes(a.domain));

    let adScoreSum = 0;
    let vmScoreSum = 0;
    let mpScoreSum = 0;
    for (const acct of repAccounts) {
      adScoreSum += accountDiscoveryScore(acct.accountDiscovery);
      vmScoreSum += valueMapScore(acct.valueMap);
      mpScoreSum += meddpiccScore(acct.meddpicc);
    }
    const n = repAccounts.length || 1;

    return {
      name: rep.name,
      email: rep.email,
      callCount: repData?.transcript_count || 0,
      lastCallDate: repData?.last_meeting || "",
      accountCount: repAccounts.length,
      accountDiscoveryScore: Math.round(adScoreSum / n),
      valueMapScore: Math.round(vmScoreSum / n),
      meddpiccScore: Math.round(mpScoreSum / n),
    };
  });

  return { reps };
}

function parseThemes(text: string): Theme[] {
  if (!text?.trim()) return [];
  const lines = text.split("\n").filter((l) => l.trim());
  const themes: Theme[] = [];
  for (const line of lines) {
    const cleaned = line.replace(/^[•\-\*]\s*/, "").trim();
    if (!cleaned) continue;
    // Extract percentage from end: "... — 42%" or "... - 42%" or "... (42%)"
    const pctMatch = cleaned.match(/[\s—\-–]+(\d{1,3})%\s*$/);
    const parenMatch = cleaned.match(/\((\d{1,3})%\)\s*$/);
    let pct = 0;
    let rest = cleaned;
    if (pctMatch) {
      pct = parseInt(pctMatch[1], 10);
      rest = cleaned.slice(0, cleaned.length - pctMatch[0].length).trim();
    } else if (parenMatch) {
      pct = parseInt(parenMatch[1], 10);
      rest = cleaned.slice(0, cleaned.length - parenMatch[0].length).trim();
    }
    // Split on first ": " for label/body
    const colonIdx = rest.indexOf(": ");
    let label = "";
    let body = rest;
    if (colonIdx > 0 && colonIdx < 80) {
      label = rest.slice(0, colonIdx).trim();
      body = rest.slice(colonIdx + 2).trim();
    }
    themes.push({ label, body, pct });
  }
  return themes;
}

export function queryAccountDiscoveryTab(): AccountDiscoveryTabData {
  const rows = getAllAccountRows();
  const aggregate = getAggregateInsight("accountDiscovery");
  const parsed = aggregate
    ? parseJson<Record<string, string>>(aggregate.result_json, {})
    : {};

  const sections: AggregateSection[] = ACCOUNT_DISCOVERY_KEYS.map((key) => ({
    key,
    label: ACCOUNT_DISCOVERY_LABELS[key],
    themes: parseThemes(parsed[key] || ""),
  }));

  return {
    totalAccounts: rows.length,
    totalTranscripts: getTotalTranscripts(),
    analyzedAt: aggregate?.analyzed_at ?? null,
    sections,
  };
}

export function queryValueMapTab(): ValueMapTabData {
  const rows = getAllAccountRows();
  const aggregate = getAggregateInsight("valueMap");
  const parsed = aggregate
    ? parseJson<Record<string, Record<string, string>>>(aggregate.result_json, {})
    : {};

  const vmRows = VALUE_MAP_APP_KEYS.map((appKey) => ({
    appKey,
    appLabel: VALUE_MAP_APP_LABELS[appKey],
    persona: parseThemes(parsed[appKey]?.persona || ""),
    jobs: parseThemes(parsed[appKey]?.jobsToBeDone || ""),
    value: parseThemes(parsed[appKey]?.valueUnlocked || ""),
  }));

  return {
    totalAccounts: rows.length,
    totalTranscripts: getTotalTranscripts(),
    analyzedAt: aggregate?.analyzed_at ?? null,
    rows: vmRows,
  };
}

export function queryMeddpiccTab(): MeddpiccTabData {
  const rows = getAllAccountRows();
  const aggregate = getAggregateInsight("meddpicc");
  const parsed = aggregate
    ? parseJson<Record<string, string>>(aggregate.result_json, {})
    : {};

  const sections: AggregateSection[] = MEDDPICC_KEYS.map((key) => ({
    key,
    label: MEDDPICC_LABELS[key],
    themes: parseThemes(parsed[key] || ""),
  }));

  return {
    totalAccounts: rows.length,
    totalTranscripts: getTotalTranscripts(),
    analyzedAt: aggregate?.analyzed_at ?? null,
    sections,
  };
}

export function queryAccountDetail(domain: string): AccountDetailData | null {
  const row = getAccountRow(domain);
  if (!row) return null;

  const account = rowToAccount(row);
  const callRows = getCallsForAccount(domain);

  const calls: CallRecord[] = callRows.map((c) => {
    const repEmails = parseJson<string[]>(c.tracked_rep_emails_json, []);
    const repNames = repEmails.map((email) => {
      const rep = TRACKED_REPS.find((r) => r.email === email);
      return rep?.name || email;
    });
    return {
      meetingUuid: c.meeting_uuid,
      date: c.start_at,
      subject: c.subject,
      reps: repNames,
    };
  });

  return { account, calls };
}
