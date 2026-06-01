"use client";

interface HeaderProps {
  lastSyncAt: string | null;
  isSyncing: boolean;
  onSync: () => void;
}

export function Header({ lastSyncAt, isSyncing, onSync }: HeaderProps) {
  return (
    <div style={{ maxWidth: 1440, margin: "0 auto", padding: "22px 32px 0" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="tt-mark lg" aria-hidden="true" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.015em" }}>Duro Tracks</span>
            <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>Sales call analysis dashboard</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.25 }}>
            <span style={{ fontSize: 11, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>
              Last sync
            </span>
            <span className="num" style={{ fontSize: 12, color: "var(--text-2)" }}>
              {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "Never"}
            </span>
          </div>
          <button className="sync-btn" onClick={onSync} disabled={isSyncing}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              className={isSyncing ? "spinning" : ""}
            >
              <path
                d="M14 8a6 6 0 1 1-2.5-4.87M14 3v3.5h-3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {isSyncing ? "Syncing…" : "Sync now"}
          </button>
        </div>
      </div>
    </div>
  );
}
