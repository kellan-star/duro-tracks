const PALETTE = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#0891b2",
  "#4f46e5",
  "#0d9488",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  const color = PALETTE[hash(name) % PALETTE.length];
  return (
    <span
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: Math.round(size * 0.42),
      }}
      className="inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0"
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
