import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_MODEL, ANTHROPIC_RPM } from "./config";
import { RateLimiter } from "./rate-limiter";

// Anthropic allows ~5 requests/minute for this account → ~13s between calls.
const limiter = new RateLimiter(ANTHROPIC_RPM, 60_000);

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Calls Claude Sonnet with a system + user prompt and returns the raw text.
 * Rate limited to ANTHROPIC_RPM requests per minute.
 */
export async function complete(system: string, user: string, maxTokens = 4096): Promise<string> {
  await limiter.take();
  const resp = await client().messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  return resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/**
 * Calls Claude and parses a JSON object out of the response, tolerating
 * markdown code fences and surrounding prose.
 */
export async function completeJson<T>(system: string, user: string, maxTokens = 4096): Promise<T> {
  const text = await complete(system, user, maxTokens);
  return parseJson<T>(text);
}

export function parseJson<T>(text: string): T {
  const trimmed = text.trim();
  // Strip ```json ... ``` fences if present.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(candidate) as T;
  } catch {
    // Fall back to extracting the outermost { ... } block.
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1)) as T;
    }
    throw new Error(`Failed to parse JSON from model response: ${text.slice(0, 200)}`);
  }
}
