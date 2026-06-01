import {
  fetchMeetings,
  fetchNotesForMeeting,
  fetchTranscriptionForMeeting,
  fetchUsers,
  type AvomaMeeting,
} from "./avoma-client";
import {
  getLastSyncTimestamp,
  setLastSyncTimestamp,
  callExists,
  upsertCall,
  upsertTranscript,
  transcriptExists,
  getCallsMissingTranscripts,
  upsertAccount,
  getAccountsNeedingAnalysis,
  getTranscriptsForAccount,
  getAnalysisHash,
  saveAnalysis,
  markAccountAnalyzed,
  setSyncing,
  isSyncing,
} from "./db";
import { canonicalRepEmail, INTERNAL_DOMAINS } from "./types";
import {
  getExternalCorporateDomains,
  domainToCompanyName,
} from "./domain-resolver";
import { analyzeAccount, computeTranscriptHash } from "./account-analyzer";
import { runAggregateAnalysis } from "./aggregate-analyzer";
import { updateProgress, resetProgress } from "./progress";

export interface SyncResult {
  newMeetings: number;
  newTranscripts: number;
  accountsAnalyzed: number;
  totalAccounts: number;
}

// Returns the canonical (primary) emails of the tracked reps present, deduped —
// so a rep who joins under any of their aliases is keyed consistently.
function getTrackedRepEmails(
  attendees: Array<{ email: string; name: string | null }>
): string[] {
  const primaries = new Set<string>();
  for (const a of attendees) {
    const primary = a.email ? canonicalRepEmail(a.email) : null;
    if (primary) primaries.add(primary);
  }
  return Array.from(primaries);
}

export async function runSync(): Promise<SyncResult> {
  if (isSyncing()) {
    return { newMeetings: 0, newTranscripts: 0, accountsAnalyzed: 0, totalAccounts: 0 };
  }

  setSyncing(true);
  try {
    return await doSync();
  } finally {
    setSyncing(false);
    resetProgress();
  }
}

async function doSync(): Promise<SyncResult> {
  updateProgress("Starting", "Fetching Avoma meetings...", 5);

  const now = new Date();
  // Only consider meetings completed in this calendar year.
  const SYNC_YEAR = 2026;
  const yearStart = new Date(Date.UTC(SYNC_YEAR, 0, 1));

  const lastSync = getLastSyncTimestamp();
  const fromDate = lastSync
    ? new Date(Math.max(new Date(lastSync).getTime() - 24 * 60 * 60 * 1000, yearStart.getTime())).toISOString()
    : yearStart.toISOString();
  const toDate = now.toISOString();

  const [avomaMeetings, avomaUsers] = await Promise.all([
    fetchMeetings(fromDate, toDate),
    fetchUsers(),
  ]);

  // Add Avoma user domains to internal set
  for (const u of avomaUsers) {
    const domain = u.user.email?.split("@")[1]?.toLowerCase();
    if (domain) INTERNAL_DOMAINS.add(domain);
  }

  updateProgress("Filtering", `Processing ${avomaMeetings.length} meetings...`, 10);

  // Filter to completed meetings with tracked reps
  const maxDeals = parseInt(process.env.MAX_DEALS || "0", 10) || Infinity;
  const relevantMeetings: AvomaMeeting[] = [];

  for (const meeting of avomaMeetings) {
    if (meeting.is_internal) continue;
    if (!meeting.attendees?.length) continue;

    // Only include meetings completed in SYNC_YEAR (and not still in the future).
    const completedAt = meeting.end_at || meeting.start_at || meeting.created;
    if (!completedAt) continue;
    const completedDate = new Date(completedAt);
    if (completedDate.getUTCFullYear() !== SYNC_YEAR) continue;
    if (completedDate.getTime() > now.getTime()) continue;

    const trackedReps = getTrackedRepEmails(meeting.attendees);
    if (trackedReps.length === 0) continue;

    // Skip calls where ALL attendees are @altium.com / @durolabs.co
    const hasExternalAttendee = meeting.attendees.some((a) => {
      const domain = a.email?.split("@")[1]?.toLowerCase();
      return domain && !INTERNAL_DOMAINS.has(domain);
    });
    if (!hasExternalAttendee) continue;

    // Skip training/team calls: more than 1 Duro rep (Blake or Reese) on the call.
    if (trackedReps.length > 1) continue;

    relevantMeetings.push(meeting);
  }

  console.log(
    `[duro-tracks] ${relevantMeetings.length} meetings with tracked reps (of ${avomaMeetings.length} total)`
  );

  // Upsert calls and identify new ones needing transcripts
  let newMeetingCount = 0;
  const newMeetingUuids: string[] = [];
  const domainMeetings = new Map<string, AvomaMeeting[]>();

  for (const meeting of relevantMeetings) {
    const attendees = (meeting.attendees || []).map((a) => ({
      email: a.email?.toLowerCase() || "",
      name: a.name,
    }));
    const trackedReps = getTrackedRepEmails(attendees);
    const externalDomains = getExternalCorporateDomains(attendees);
    const accountDomain = externalDomains[0] || null;

    if (!accountDomain) continue;

    const isNew = !callExists(meeting.uuid);

    upsertCall({
      meetingUuid: meeting.uuid,
      subject: meeting.subject || "",
      startAt: meeting.start_at || meeting.created,
      organizerEmail: meeting.organizer_email || "",
      attendeesJson: JSON.stringify(attendees),
      accountDomain,
      trackedRepEmailsJson: JSON.stringify(trackedReps),
    });

    if (isNew) {
      newMeetingCount++;
      newMeetingUuids.push(meeting.uuid);
    }

    const existing = domainMeetings.get(accountDomain) || [];
    existing.push(meeting);
    domainMeetings.set(accountDomain, existing);
  }

  // Apply MAX_DEALS limit to domains
  const allDomains = Array.from(domainMeetings.keys());
  const limitedDomains = allDomains.slice(0, maxDeals);

  // Fetch transcripts: new meetings + retry any calls that are still missing transcripts
  const callsMissingTranscripts = getCallsMissingTranscripts();
  const allNeedingTranscripts = [
    ...newMeetingUuids.filter((uuid) => !transcriptExists(uuid)),
    ...callsMissingTranscripts.filter((uuid) => !newMeetingUuids.includes(uuid)),
  ];

  updateProgress(
    "Fetching transcripts",
    `${allNeedingTranscripts.length} meetings (${callsMissingTranscripts.length} retries)...`,
    20
  );

  let newTranscriptCount = 0;

  for (let i = 0; i < allNeedingTranscripts.length; i++) {
    const uuid = allNeedingTranscripts[i];
    const pct = 20 + Math.round(((i + 1) / allNeedingTranscripts.length) * 25);
    updateProgress(
      "Fetching transcripts",
      `${i + 1}/${allNeedingTranscripts.length}`,
      pct
    );

    if (i > 0 && i % 5 === 0) {
      await new Promise((r) => setTimeout(r, 1200));
    }

    // Try transcript first, fall back to notes
    let text = await fetchTranscriptionForMeeting(uuid);
    let source: "transcript" | "notes" = "transcript";

    if (!text) {
      // Use the full sync window for the notes fallback.
      const notesFrom = yearStart.toISOString();
      const notesTo = now.toISOString();
      const notes = await fetchNotesForMeeting(uuid, notesFrom, notesTo);
      text = notes
        .map((n) => (typeof n.data === "string" ? n.data : ""))
        .filter(Boolean)
        .join("\n\n");
      source = "notes";
    }

    if (text?.trim()) {
      upsertTranscript(uuid, text, source);
      newTranscriptCount++;
      console.log(`[duro-tracks] Transcript fetched for ${uuid} (${source})`);
    } else {
      console.log(`[duro-tracks] No transcript available for ${uuid}`);
    }
  }

  updateProgress("Updating accounts", "Computing account metadata...", 50);

  // Update account records for limited domains
  for (const domain of limitedDomains) {
    const meetings = domainMeetings.get(domain) || [];
    const companyName = domainToCompanyName(domain);

    // Determine lead rep (most frequent tracked rep across calls)
    const repFreq = new Map<string, number>();
    for (const m of meetings) {
      const reps = getTrackedRepEmails(
        (m.attendees || []).map((a) => ({
          email: a.email?.toLowerCase() || "",
          name: a.name,
        }))
      );
      for (const rep of reps) {
        repFreq.set(rep, (repFreq.get(rep) || 0) + 1);
      }
    }

    let leadRepEmail: string | null = null;
    let maxCount = 0;
    for (const [email, count] of repFreq) {
      if (count > maxCount) {
        leadRepEmail = email;
        maxCount = count;
      }
    }

    const dates = meetings
      .map((m) => m.start_at || m.created)
      .filter(Boolean)
      .sort();

    // Count transcripts for this account
    const transcriptTexts = getTranscriptsForAccount(domain);

    upsertAccount({
      domain,
      companyName,
      leadRepEmail,
      firstCallDate: dates[0] || new Date().toISOString(),
      lastCallDate: dates[dates.length - 1] || new Date().toISOString(),
      callCount: meetings.length,
      transcriptCount: transcriptTexts.length,
    });
  }

  // Run AI analysis for accounts needing it
  const accountsToAnalyze = getAccountsNeedingAnalysis().filter((d) =>
    limitedDomains.includes(d)
  );

  let accountsAnalyzed = 0;
  updateProgress(
    "AI Analysis",
    `0/${accountsToAnalyze.length} accounts...`,
    55
  );

  for (let i = 0; i < accountsToAnalyze.length; i++) {
    const domain = accountsToAnalyze[i];
    const companyName = domainToCompanyName(domain);
    const pct = 55 + Math.round(((i + 1) / accountsToAnalyze.length) * 40);
    updateProgress(
      "AI Analysis",
      `${i + 1}/${accountsToAnalyze.length} — ${companyName}`,
      pct
    );

    const transcripts = getTranscriptsForAccount(domain);
    if (transcripts.length === 0) {
      // Don't mark as analyzed — retry when transcripts become available
      console.log(`[duro-tracks] Skipping ${companyName}: no transcripts yet`);
      continue;
    }

    const hash = computeTranscriptHash(transcripts);
    const existingHash = getAnalysisHash(domain);

    if (hash === existingHash) {
      markAccountAnalyzed(domain);
      continue;
    }

    // Pace AI calls (13s gap for 5 req/min limit)
    if (accountsAnalyzed > 0) {
      await new Promise((r) => setTimeout(r, 13000));
    }

    const result = await analyzeAccount(companyName, transcripts);
    saveAnalysis(
      domain,
      JSON.stringify(result.accountDiscovery),
      JSON.stringify(result.valueMap),
      JSON.stringify(result.meddpicc),
      hash
    );
    markAccountAnalyzed(domain);
    accountsAnalyzed++;
  }

  // Run aggregate analysis if any accounts were (re-)analyzed
  if (accountsAnalyzed > 0) {
    updateProgress("Aggregate Analysis", "Generating cross-account insights...", 96);
    await runAggregateAnalysis();
  }

  setLastSyncTimestamp(now.toISOString());
  updateProgress("Done", `Sync complete`, 100);

  return {
    newMeetings: newMeetingCount,
    newTranscripts: newTranscriptCount,
    accountsAnalyzed,
    totalAccounts: limitedDomains.length,
  };
}
