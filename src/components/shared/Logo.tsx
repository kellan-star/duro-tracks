// Duro Tracks logo mark — concentric "revision rings" evoking a PLM revision
// history, in Duro blue.
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect width="24" height="24" rx="6" fill="var(--brand)" />
        <circle cx="12" cy="12" r="7" stroke="#fff" strokeWidth="1.6" opacity="0.55" />
        <circle cx="12" cy="12" r="4" stroke="#fff" strokeWidth="1.6" opacity="0.8" />
        <circle cx="12" cy="12" r="1.5" fill="#fff" />
      </svg>
      <span className="font-semibold tracking-tight" style={{ fontSize: 15 }}>
        Duro Tracks
      </span>
    </span>
  );
}
