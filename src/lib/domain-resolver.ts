import { INTERNAL_DOMAINS, PERSONAL_EMAIL_DOMAINS } from "./types";

export function classifyEmail(email: string): "internal" | "personal" | "corporate" {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return "personal";
  if (INTERNAL_DOMAINS.has(domain)) return "internal";
  if (PERSONAL_EMAIL_DOMAINS.has(domain)) return "personal";
  return "corporate";
}

export function getExternalCorporateDomains(
  attendees: Array<{ email: string }>
): string[] {
  const domains = new Set<string>();
  for (const a of attendees) {
    if (classifyEmail(a.email) === "corporate") {
      const domain = a.email.split("@")[1]?.toLowerCase();
      if (domain) domains.add(domain);
    }
  }
  return Array.from(domains);
}

export function resolvePrimaryDomain(
  allAttendeeLists: Array<Array<{ email: string }>>
): string | null {
  const freq = new Map<string, number>();
  for (const attendees of allAttendeeLists) {
    const domains = getExternalCorporateDomains(attendees);
    for (const d of domains) {
      freq.set(d, (freq.get(d) || 0) + 1);
    }
  }
  if (freq.size === 0) return null;
  let best: string | null = null;
  let bestCount = 0;
  for (const [domain, count] of freq) {
    if (count > bestCount) {
      best = domain;
      bestCount = count;
    }
  }
  return best;
}

export function domainToCompanyName(domain: string): string {
  const name = domain.split(".")[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}
