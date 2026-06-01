import { AVOMA_RPM } from "./config";
import { RateLimiter } from "./rate-limiter";

// ---------------------------------------------------------------------------
// Avoma REST API client.
//
// Docs: https://api.avoma.com/  (v1). All calls are rate limited to
// AVOMA_RPM requests/minute via a shared token bucket.
// ---------------------------------------------------------------------------

const BASE_URL = "https://api.avoma.com";
const limiter = new RateLimiter(AVOMA_RPM, 60_000);

export interface AvomaAttendee {
  name: string;
  email: string;
}

export interface AvomaMeeting {
  id: string;
  subject: string;
  startTime: string | null;
  attendees: AvomaAttendee[];
}

export function hasAvomaKey(): boolean {
  return Boolean(process.env.AVOMA_API_KEY);
}

function apiKey(): string {
  const key = process.env.AVOMA_API_KEY;
  if (!key) throw new Error("AVOMA_API_KEY is not set");
  return key;
}

async function request<T>(pathWithQuery: string): Promise<T> {
  await limiter.take();
  const res = await fetch(`${BASE_URL}${pathWithQuery}`, {
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Avoma ${res.status} on ${pathWithQuery}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

interface RawAttendee {
  name?: string;
  email?: string;
}
interface RawMeeting {
  uuid?: string;
  id?: string;
  subject?: string;
  start_at?: string;
  start_time?: string;
  attendees?: RawAttendee[];
}
interface Paginated<T> {
  results: T[];
  next: string | null;
}

function normalizeMeeting(m: RawMeeting): AvomaMeeting {
  return {
    id: String(m.uuid ?? m.id ?? ""),
    subject: m.subject ?? "(no subject)",
    startTime: m.start_at ?? m.start_time ?? null,
    attendees: (m.attendees ?? [])
      .map((a) => ({ name: a.name ?? "", email: (a.email ?? "").toLowerCase() }))
      .filter((a) => a.email),
  };
}

/**
 * Lists meetings in [fromDate, toDate] (ISO date strings), following
 * pagination until exhausted.
 */
export async function listMeetings(fromDate: string, toDate: string): Promise<AvomaMeeting[]> {
  const meetings: AvomaMeeting[] = [];
  let next: string | null =
    `/v1/meetings/?from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(
      toDate,
    )}&page_size=100`;

  while (next) {
    const page: Paginated<RawMeeting> = await request<Paginated<RawMeeting>>(next);
    for (const m of page.results ?? []) meetings.push(normalizeMeeting(m));
    // `next` may be a full URL; reduce to a path+query for our request helper.
    next = page.next ? page.next.replace(BASE_URL, "") : null;
  }
  return meetings;
}

interface RawTranscription {
  transcript?: Array<{ transcript?: string; text?: string }>;
  transcription_text?: string;
}

/** Fetches the raw transcript text for a meeting, or null if unavailable. */
export async function getTranscription(meetingId: string): Promise<string | null> {
  try {
    const data = await request<RawTranscription>(
      `/v1/transcriptions/?meeting_uuid=${encodeURIComponent(meetingId)}`,
    );
    if (data.transcription_text) return data.transcription_text;
    if (Array.isArray(data.transcript)) {
      const text = data.transcript
        .map((seg) => seg.transcript ?? seg.text ?? "")
        .filter(Boolean)
        .join("\n");
      return text || null;
    }
    return null;
  } catch {
    return null;
  }
}

interface RawNotes {
  notes?: string;
  data?: string;
}

/** Fetches meeting notes text as a fallback when no transcript exists. */
export async function getNotes(meetingId: string): Promise<string | null> {
  try {
    const data = await request<RawNotes>(
      `/v1/meetings/${encodeURIComponent(meetingId)}/notes/`,
    );
    return data.notes ?? data.data ?? null;
  } catch {
    return null;
  }
}
