"use client";

import { useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { useProgress } from "@/hooks/use-data";

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={spinning ? "spin" : ""}
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

export function SyncButton() {
  const [polling, setPolling] = useState(false);
  const { data: progress } = useProgress(polling);
  const { mutate } = useSWRConfig();
  const wasRunning = useRef(false);

  const running = progress?.running ?? false;

  // When a run finishes, revalidate all data and stop polling.
  useEffect(() => {
    if (wasRunning.current && !running) {
      ["/api/kpis", "/api/accounts", "/api/reps", "/api/insights/discovery", "/api/insights/valuemap", "/api/insights/meddpicc"].forEach(
        (k) => mutate(k),
      );
      mutate((key) => typeof key === "string" && key.startsWith("/api/account/"));
      setPolling(false);
    }
    wasRunning.current = running;
  }, [running, mutate]);

  const sync = async () => {
    setPolling(true);
    await fetch("/api/sync", { method: "POST" });
  };

  return (
    <button
      onClick={sync}
      disabled={running}
      className="inline-flex items-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-[13px] font-medium hover:bg-[var(--bg)] disabled:opacity-70"
    >
      <RefreshIcon spinning={running} />
      {running ? `Syncing… ${progress?.phase ?? ""}` : "Sync now"}
    </button>
  );
}
