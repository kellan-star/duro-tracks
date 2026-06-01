import fs from "node:fs";
import path from "node:path";

const cache = new Map<string, string>();

/** Reads a prompt markdown file from src/prompts (cached). */
export function loadPrompt(name: string): string {
  const cached = cache.get(name);
  if (cached) return cached;
  const file = path.join(process.cwd(), "src", "prompts", name);
  const text = fs.readFileSync(file, "utf8");
  cache.set(name, text);
  return text;
}
