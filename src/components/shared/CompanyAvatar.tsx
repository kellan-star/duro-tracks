export function CompanyAvatar({ name }: { name: string }) {
  const initial = name.slice(0, 1).toUpperCase();
  const hue = (name.charCodeAt(0) * 47) % 360;
  return (
    <span
      style={{
        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
        background: `oklch(95% 0.04 ${hue})`,
        color: `oklch(35% 0.10 ${hue})`,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontWeight: 600, fontSize: 11,
        border: `0.5px solid oklch(88% 0.05 ${hue})`,
      }}
    >
      {initial}
    </span>
  );
}
