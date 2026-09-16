import {
  fetchMeetings,
  fetchNotesResult,
  fetchTranscriptionResult,
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
  markNoTranscript,
  clearNoTranscript,
  isNoTranscriptCached,
  getSkippableNoTranscriptUuids,
  upsertAccount,
  getAccountsNeedingAnalysis,
  getTranscriptsForAccount,
  getAnalysisHash,
  saveAnalysis,
  markAccountAnalyzed,
  setSyncing,
  isSyncing,
} from "./db";
import { canonicalRepEmail, INTERNAL_DOMAINS, type AnalysisResult } from "./types";
import {
  getExternalCorporateDomains,
  domainToCompanyName,
} from "./domain-resolver";
import {
  analyzeAccount,
  analyzeAccountsBatch,
  computeTranscriptHash,
} from "./account-analyzer";
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

export async function runSync(force = false): Promise<SyncResult> {
  if (isSyncing()) {
    return { newMeetings: 0, newTranscripts: 0, accountsAnalyzed: 0, totalAccounts: 0 };
  }

  setSyncing(true);
  try {
    return await doSync(force);
  } finally {
    setSyncing(false);
    resetProgress();
  }
}

// `force` (manual "Sync now") re-runs per-account + cross-account analysis even
// when transcripts are unchanged. Auto/incremental syncs leave it false.
async function doSync(force: boolean): Promise<SyncResult> {
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

  // Grace window for the no-transcript negative cache: meetings this recent are
  // re-polled even when a previous sync found nothing, since Avoma's
  // transcription can lag the meeting itself. Set to 0 to bypass the cache and
  // re-poll every meeting (the escape hatch if an entry is ever wrong).
  const parsedRecheckDays = parseInt(
    process.env.NO_TRANSCRIPT_RECHECK_DAYS || "",
    10
  );
  const NO_TRANSCRIPT_RECHECK_DAYS =
    Number.isFinite(parsedRecheckDays) && parsedRecheckDays >= 0
      ? parsedRecheckDays
      : 7;
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

  // Group relevant meetings by prospect domain WITHOUT writing yet, so the
  // MAX_DEALS cap is applied BEFORE we store calls / fetch transcripts /
  // analyze. (Otherwise we'd fetch transcripts for every domain but only build
  // accounts for the capped few — slow, and it crowds out the analysis step.)
  const domainMeetings = new Map<string, AvomaMeeting[]>();
  for (const meeting of relevantMeetings) {
    const attendees = (meeting.attendees || []).map((a) => ({
      email: a.email?.toLowerCase() || "",
      name: a.name,
    }));
    const accountDomain = getExternalCorporateDomains(attendees)[0] || null;
    if (!accountDomain) continue;
    const existing = domainMeetings.get(accountDomain) || [];
    existing.push(meeting);
    domainMeetings.set(accountDomain, existing);
  }

  // Apply the MAX_DEALS limit to domains; everything below is scoped to these.
  const allDomains = Array.from(domainMeetings.keys());
  const limitedDomains = allDomains.slice(0, maxDeals);

  // Upsert calls (only for the limited domains) and identify new ones.
  let newMeetingCount = 0;
  const newMeetingUuids: string[] = [];
  for (const domain of limitedDomains) {
    for (const meeting of domainMeetings.get(domain) || []) {
      const attendees = (meeting.attendees || []).map((a) => ({
        email: a.email?.toLowerCase() || "",
        name: a.name,
      }));
      const trackedReps = getTrackedRepEmails(attendees);
      const isNew = !callExists(meeting.uuid);

      upsertCall({
        meetingUuid: meeting.uuid,
        subject: meeting.subject || "",
        startAt: meeting.start_at || meeting.created,
        organizerEmail: meeting.organizer_email || "",
        attendeesJson: JSON.stringify(attendees),
        accountDomain: domain,
        trackedRepEmailsJson: JSON.stringify(trackedReps),
      });

      if (isNew) {
        newMeetingCount++;
        newMeetingUuids.push(meeting.uuid);
      }
    }
  }

  // Fetch transcripts: new meetings + retry any calls that are still missing transcripts
  const callsMissingTranscripts = getCallsMissingTranscripts();
  const candidateUuids = [
    ...newMeetingUuids.filter((uuid) => !transcriptExists(uuid)),
    ...callsMissingTranscripts.filter((uuid) => !newMeetingUuids.includes(uuid)),
  ];

  // Drop meetings Avoma has already confirmed have no transcript, so we stop
  // re-polling them every sync. Anything within the recheck window is kept in
  // the list, so a late-arriving transcript is still picked up.
  const skippable =
    NO_TRANSCRIPT_RECHECK_DAYS === 0
      ? new Set<string>()
      : getSkippableNoTranscriptUuids(NO_TRANSCRIPT_RECHECK_DAYS);
  const allNeedingTranscripts = candidateUuids.filter((uuid) => !skippable.has(uuid));
  const skippedCount = candidateUuids.length - allNeedingTranscripts.length;

  if (skippedCount > 0) {
    console.log(
      `[duro-tracks] Skipping ${skippedCount} meeting(s) known to have no transcript ` +
        `(rechecking any from the last ${NO_TRANSCRIPT_RECHECK_DAYS} days)`
    );
  }

  // Meeting start times, for dating negative-cache entries.
  const meetingDates = new Map<string, string | null>();
  for (const meetings of domainMeetings.values()) {
    for (const m of meetings) {
      meetingDates.set(m.uuid, m.start_at || m.created || null);
    }
  }

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
    const transcript = await fetchTranscriptionResult(uuid);
    let text = transcript.status === "ok" ? transcript.value : "";
    let source: "transcript" | "notes" = "transcript";

    // Only a definitive "Avoma has nothing" on BOTH lookups is cacheable. If
    // either call failed outright we learned nothing, so we leave the meeting in
    // the worklist rather than risk hiding a transcript that does exist.
    let lookupFailed = transcript.status === "error";

    if (!text) {
      // Use the full sync window for the notes fallback.
      const notesFrom = yearStart.toISOString();
      const notesTo = now.toISOString();
      const notesResult = await fetchNotesResult(uuid, notesFrom, notesTo);
      if (notesResult.status === "error") lookupFailed = true;
      text =
        notesResult.status === "ok"
          ? notesResult.value
              .map((n) => (typeof n.data === "string" ? n.data : ""))
              .filter(Boolean)
              .join("\n\n")
          : "";
      source = "notes";
    }

    if (text?.trim()) {
      upsertTranscript(uuid, text, source);
      // A transcript arrived after all — make sure a stale negative entry can't
      // keep it out of future syncs.
      clearNoTranscript(uuid);
      newTranscriptCount++;
      console.log(`[duro-tracks] Transcript fetched for ${uuid} (${source})`);
    } else if (lookupFailed) {
      // Transient (auth/timeout/rate limit). Don't remember this as an absence.
      console.warn(
        `[duro-tracks] Transcript lookup failed for ${uuid}; will retry next sync`
      );
    } else {
      // Log only the first time we learn a meeting has nothing, so a normal sync
      // isn't hundreds of identical lines.
      const alreadyKnown = isNoTranscriptCached(uuid);
      markNoTranscript(uuid, meetingDates.get(uuid) ?? null);
      if (!alreadyKnown) {
        console.log(`[duro-tracks] No transcript available for ${uuid}`);
      }
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

  // Build the analysis work list. A forced (manual) sync re-analyzes every
  // in-scope account; otherwise only those flagged as needing re-analysis.
  // Accounts whose transcripts are unchanged are skipped (unless forced).
  const limitedSet = new Set(limitedDomains);
  const candidates = force
    ? limitedDomains
    : getAccountsNeedingAnalysis().filter((d) => limitedSet.has(d));

  const work: { domain: string; companyName: string; transcripts: string[]; hash: string }[] = [];
  for (const domain of candidates) {
    const companyName = domainToCompanyName(domain);
    const transcripts = getTranscriptsForAccount(domain);
    if (transcripts.length === 0) {
      console.log(`[duro-tracks] Skipping ${companyName}: no transcripts yet`);
      continue;
    }
    const hash = computeTranscriptHash(transcripts);
    if (!force && hash === getAnalysisHash(domain)) {
      markAccountAnalyzed(domain);
      continue;
    }
    work.push({ domain, companyName, transcripts, hash });
  }

  let accountsAnalyzed = 0;
  const persist = (domain: string, hash: string, result: AnalysisResult) => {
    saveAnalysis(
      domain,
      JSON.stringify(result.accountDiscovery),
      JSON.stringify(result.valueMap),
      JSON.stringify(result.meddpicc),
      JSON.stringify(result.deal),
      hash
    );
    markAccountAnalyzed(domain);
    accountsAnalyzed++;
  };

  // Batch API (default) is ~50% cheaper and needs no per-call pacing; set
  // BATCH_ANALYSIS=0 to fall back to sequential live calls.
  const useBatch = (process.env.BATCH_ANALYSIS ?? "1") !== "0";

  if (work.length > 0 && useBatch) {
    updateProgress("AI Analysis (batch)", `Submitting ${work.length} accounts…`, 55);
    const resultsByDomain = await analyzeAccountsBatch(
      work.map((w) => ({ domain: w.domain, companyName: w.companyName, transcripts: w.transcripts })),
      (done, total) =>
        updateProgress(
          "AI Analysis (batch)",
          `${done}/${total} accounts analyzed`,
          55 + Math.round((done / Math.max(total, 1)) * 40)
        )
    );
    for (const w of work) {
      const result = resultsByDomain.get(w.domain);
      if (result) persist(w.domain, w.hash, result);
    }
  } else {
    // Sequential live calls, paced for the 5 req/min limit.
    for (let i = 0; i < work.length; i++) {
      const w = work[i];
      updateProgress(
        "AI Analysis",
        `${i + 1}/${work.length} — ${w.companyName}`,
        55 + Math.round(((i + 1) / work.length) * 40)
      );
      if (i > 0) await new Promise((r) => setTimeout(r, 13000));
      const result = await analyzeAccount(w.companyName, w.transcripts);
      persist(w.domain, w.hash, result);
    }
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
