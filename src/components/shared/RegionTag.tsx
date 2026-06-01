import type { Region } from "@/lib/types";

export function RegionTag({ region }: { region: Region | null }) {
  if (!region) return <span className="text-[var(--text-subtle)]">—</span>;
  return <span className="tag">{region}</span>;
}
