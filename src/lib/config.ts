import type { TrackedRep } from "./types";

// ---------------------------------------------------------------------------
// Tracked sales reps (the Duro team).
//
// NOTE: regions and email addresses below are best-effort placeholders derived
// from the PRD — confirm/replace with the reps' real Avoma login emails so
// attendee matching works against live data.
// ---------------------------------------------------------------------------
export const TRACKED_REPS: TrackedRep[] = [
  { name: "Blake O'Connor", emails: ["blake@durolabs.co"], region: "US" },
  { name: "Reese Fairchild", emails: ["reese@durolabs.co"], region: "EMEA" },
];

/** Email domains considered "internal" (never counted as a prospect/account). */
export const INTERNAL_DOMAINS = ["durolabs.co", "altium.com", "renesas.com"];

/** Personal/free email domains excluded from prospect grouping. */
export const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "live.com",
  "me.com",
  "msn.com",
  "ymail.com",
  "gmx.com",
  "mail.com",
]);

/** Coverage threshold (percent of accounts) for surfacing an aggregate theme. */
export const AGGREGATE_THRESHOLD = 30;

/** How many days back the first/full sync reaches. */
export const SYNC_WINDOW_DAYS = 90;

/** Anthropic model used for all analysis. */
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

/** Max accounts processed per sync (0 = unlimited). */
export const MAX_DEALS = Number.parseInt(process.env.MAX_DEALS || "0", 10) || 0;

/** Rate limits. */
export const AVOMA_RPM = 60;
export const ANTHROPIC_RPM = 5;
