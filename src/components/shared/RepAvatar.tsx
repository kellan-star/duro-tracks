export function RepAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      style={{
        width: 26, height: 26, borderRadius: 999, flexShrink: 0,
        background: "var(--surface-2)", color: "var(--text-2)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontWeight: 600, fontSize: 10.5,
        border: "0.5px solid var(--border)",
      }}
    >
      {initials}
    </span>
  );
}
