import { avomaRateLimiter } from "./rate-limiter";
import { getCached, setCache } from "./cache";

const BASE_URL = "https://api.avoma.com";
const API_KEY = process.env.AVOMA_API_KEY || "";

const CACHE_TTL_15MIN = 15 * 60 * 1000;
const CACHE_TTL_24HR = 24 * 60 * 60 * 1000;

async function avomaFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, BASE_URL);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const MAX_ATTEMPTS = 4;
  const backoff = (attempt: number, retryAfter = 0) =>
    new Promise((r) =>
      setTimeout(r, retryAfter > 0 ? retryAfter * 1000 : Math.min(2000 * 2 ** attempt, 15000))
    );

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await avomaRateLimiter.acquire();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${API_KEY}` },
        signal: controller.signal,
      });
    } catch (e) {
      // Network error / timeout — retry with backoff.
      clearTimeout(timeout);
      lastError = e;
      await backoff(attempt);
      continue;
    }
    clearTimeout(timeout);

    // Retry transient failures (rate limit + any 5xx) with backoff.
    if (res.status === 429 || res.status >= 500) {
      lastError = new Error(`Avoma API error ${res.status}`);
      const retryAfter = parseInt(res.headers.get("retry-after") || "0", 10);
      await backoff(attempt, retryAfter);
      continue;
    }

    // Other non-OK responses (e.g. 401/403/404) are not retryable — fail fast.
    if (!res.ok) {
      throw new Error(`Avoma API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }

    return res.json();
  }

  throw lastError instanceof Error
    ? new Error(`Avoma API: ${lastError.message} (after ${MAX_ATTEMPTS} attempts) for ${path}`)
    : new Error(`Avoma API: max retries exceeded for ${path}`);
}

export interface AvomaMeeting {
  uuid: string;
  subject: string;
  created: string;
  modified: string;
  organizer_email: string;
  state: string;
  notes_ready: boolean;
  is_internal: boolean;
  attendees?: Array<{
    email: string;
    name: string | null;
    uuid: string;
  }>;
  crm_associations?: Array<{
    crm_obj_id: string;
    crm_obj_type: string;
  }>;
  start_at?: string;
  end_at?: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AvomaSmartCategory {
  uuid: string;
  name: string;
  key: string;
  is_default: boolean;
  keywords: Array<{ label: string; uuid: string }>;
  prompts: Array<{ label: string; uuid: string }>;
}

export interface AvomaUser {
  uuid: string;
  user: {
    email: string;
    first_name: string;
    last_name: string;
  };
}

export interface AvomaNote {
  created: string;
  modified: string;
  data: string | object;
}

export async function fetchSmartCategories(): Promise<AvomaSmartCategory[]> {
  const cached = getCached<AvomaSmartCategory[]>("smart_categories");
  if (cached) return cached;

  const res = await avomaFetch<PaginatedResponse<AvomaSmartCategory> | AvomaSmartCategory[]>("/v1/smart_categories/");
  const categories = Array.isArray(res) ? res : (res.results || []);
  setCache("smart_categories", categories, CACHE_TTL_24HR);
  return categories;
}

export async function fetchUsers(): Promise<AvomaUser[]> {
  const cached = getCached<AvomaUser[]>("avoma_users");
  if (cached) return cached;

  const res = await avomaFetch<{ results?: AvomaUser[] } | AvomaUser[]>("/v1/users/");
  const users = Array.isArray(res) ? res : (res.results || []);
  setCache("avoma_users", users, CACHE_TTL_24HR);
  return users;
}

export async function fetchMeetings(fromDate: string, toDate: string): Promise<AvomaMeeting[]> {
  const cacheKey = `meetings:${fromDate}:${toDate}`;
  const cached = getCached<AvomaMeeting[]>(cacheKey);
  if (cached) return cached;

  const allMeetings: AvomaMeeting[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const params: Record<string, string> = {
      from_date: fromDate,
      to_date: toDate,
      page_size: "100",
      include_crm_associations: "true",
      page: String(page),
    };
    const res = await avomaFetch<PaginatedResponse<AvomaMeeting>>("/v1/meetings/", params);
    allMeetings.push(...res.results);
    hasMore = res.next !== null;
    page++;
  }

  setCache(cacheKey, allMeetings, CACHE_TTL_15MIN);
  return allMeetings;
}

export async function fetchNotesForMeeting(
  meetingUuid: string,
  fromDate: string,
  toDate: string
): Promise<AvomaNote[]> {
  const cacheKey = `notes:${meetingUuid}`;
  const cached = getCached<AvomaNote[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await avomaFetch<PaginatedResponse<AvomaNote>>("/v1/notes/", {
      meeting_uuid: meetingUuid,
      output_format: "markdown",
      from_date: fromDate,
      to_date: toDate,
      page_size: "20",
    });
    setCache(cacheKey, res.results, CACHE_TTL_15MIN);
    return res.results;
  } catch {
    return [];
  }
}

export interface AvomaRevenueIntelTimeline {
  data?: Array<{
    deal_id?: string;
    deal_name?: string;
    qualification_score?: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface AvomaTranscription {
  uuid: string;
  meeting_uuid?: string;
  data: string;
  created?: string;
  modified?: string;
}

export async function fetchTranscriptionForMeeting(
  meetingUuid: string
): Promise<string | null> {
  const cacheKey = `transcript:${meetingUuid}`;
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  try {
    const res = await avomaFetch<
      PaginatedResponse<AvomaTranscription> | AvomaTranscription
    >("/v1/transcriptions/", { meeting_uuid: meetingUuid });

    let text: string;
    if ("results" in res && Array.isArray(res.results)) {
      text = res.results
        .map((t) => (typeof t.data === "string" ? t.data : ""))
        .filter(Boolean)
        .join("\n");
    } else if ("data" in res && typeof res.data === "string") {
      text = res.data;
    } else {
      return null;
    }

    if (text.trim()) {
      setCache(cacheKey, text, CACHE_TTL_15MIN);
      return text;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchRevenueIntelTimeline(
  crmEntityId: string,
  crmEntityType: string = "opportunity"
): Promise<AvomaRevenueIntelTimeline | null> {
  const cacheKey = `rev_intel:${crmEntityType}:${crmEntityId}`;
  const cached = getCached<AvomaRevenueIntelTimeline>(cacheKey);
  if (cached) return cached;

  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const res = await avomaFetch<AvomaRevenueIntelTimeline>("/v1/revenue_intel/timeline/", {
      crm_entity_id: crmEntityId,
      object_type: crmEntityType,
      start_at: ninetyDaysAgo.toISOString(),
    });
    console.log(`[duro-tracks] Revenue Intel for ${crmEntityType}/${crmEntityId}:`, JSON.stringify(res).slice(0, 500));
    setCache(cacheKey, res, CACHE_TTL_15MIN);
    return res;
  } catch (e) {
    console.log(`[duro-tracks] Revenue Intel API failed for ${crmEntityId}:`, String(e).slice(0, 200));
    return null;
  }
}
