"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { mutate } from "swr";
import type { SyncStatus } from "@/lib/types";

const AUTO_REFRESH_MS = 60 * 60 * 1000;
const POLL_MS = 3000;

export function useSync() {
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Manual sync forces a full re-analysis (force=true); the auto-refresh runs
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

  // On mount: load status, and resume polling if a sync is already running
  // (e.g. started in another tab or before a page reload).
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
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [startPolling]);

  // Periodic incremental auto-refresh while the dashboard is open.
  useEffect(() => {
    autoRef.current = setInterval(() => {
      if (!isSyncing) triggerSync(false);
    }, AUTO_REFRESH_MS);
    return () => {
      if (autoRef.current) clearInterval(autoRef.current);
    };
  }, [isSyncing, triggerSync]);

  // Cleanup polling on unmount.
  useEffect(() => stopPolling, [stopPolling]);

  return { lastSyncAt, isSyncing, triggerSync, error };
}
