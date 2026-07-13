"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { mutate } from "swr";
import type { SyncStatus } from "@/lib/types";

const POLL_MS = 3000;
// How often we check whether it's time for the daily 6am-ET sync.
const DAILY_CHECK_MS = 10 * 60 * 1000;

// The most recent 6:00am America/New_York instant (UTC ms) that has passed.
// Derived from the actual ET wall clock, so it's correct across DST.
function mostRecent6amEtMs(nowMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(nowMs));
  const val = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const h = val("hour") % 24;
  const secsSinceEtMidnight = h * 3600 + val("minute") * 60 + val("second");
  const secsSince6am = secsSinceEtMidnight - 6 * 3600;
  const offset = secsSince6am >= 0 ? secsSince6am : secsSince6am + 24 * 3600;
  return nowMs - offset * 1000;
}

export function useSync() {
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs mirror the latest state so the stable daily-check interval can read
  // current values without being torn down/recreated on every change.
  const lastSyncRef = useRef<string | null>(null);
  const syncingRef = useRef(false);
  lastSyncRef.current = lastSyncAt;
  syncingRef.current = isSyncing;

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Poll sync status until the server reports it's no longer syncing, then
  // revalidate all tab data so the new results appear without a manual refresh.
  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const data: SyncStatus = await fetch("/api/sync").then((r) => r.json());
        setLastSyncAt(data.lastSyncAt);
        if (!data.isSyncing) {
          setIsSyncing(false);
          stopPolling();
          await mutate(() => true);
        }
      } catch {
        // transient — keep polling
      }
    }, POLL_MS);
  }, [stopPolling]);

  // Manual sync forces a full re-analysis (force=true); the daily auto-sync runs
  // an incremental sync (force=false). The request returns immediately (202);
  // progress is tracked by polling.
  const triggerSync = useCallback(
    async (force = true) => {
      setError(null);
      setIsSyncing(true);
      try {
        const res = await fetch(`/api/sync${force ? "?force=1" : ""}`, { method: "POST" });
        // 202 = started; 409 = already running. Either way, poll for completion.
        if (!res.ok && res.status !== 409) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Sync failed (${res.status})`);
        }
        startPolling();
      } catch (e) {
        setError(String(e));
        setIsSyncing(false);
      }
    },
    [startPolling]
  );

  // Fire the daily incremental sync if there hasn't been one since the most
  // recent 6am ET.
  const maybeDailySync = useCallback(() => {
    if (syncingRef.current) return;
    const last = lastSyncRef.current ? new Date(lastSyncRef.current).getTime() : 0;
    if (last < mostRecent6amEtMs(Date.now())) {
      triggerSync(false);
    }
  }, [triggerSync]);

  // On mount: load status, resume polling if a sync is already running, then
  // run the daily check.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data: SyncStatus = await fetch("/api/sync").then((r) => r.json());
        if (cancelled) return;
        setLastSyncAt(data.lastSyncAt);
        if (data.isSyncing) {
          setIsSyncing(true);
          startPolling();
        } else {
          maybeDailySync();
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [startPolling, maybeDailySync]);

  // Daily 6am-ET auto-sync check while the dashboard is open.
  useEffect(() => {
    const id = setInterval(maybeDailySync, DAILY_CHECK_MS);
    return () => clearInterval(id);
  }, [maybeDailySync]);

  // Cleanup polling on unmount.
  useEffect(() => stopPolling, [stopPolling]);

  return { lastSyncAt, isSyncing, triggerSync, error };
}
