"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SyncStatus } from "@/lib/types";

const SIXTY_MINUTES = 60 * 60 * 1000;

export function useSync() {
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/sync");
      if (res.ok) {
        const data: SyncStatus = await res.json();
        setLastSyncAt(data.lastSyncAt);
        setIsSyncing(data.isSyncing);
      }
    } catch {
      // ignore status fetch errors
    }
  }, []);

  const triggerSync = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Sync failed");
      }
      setLastSyncAt(new Date().toISOString());
    } catch (e) {
      setError(String(e));
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // 60-minute auto-refresh
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (!isSyncing) triggerSync();
    }, SIXTY_MINUTES);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSyncing, triggerSync]);

  return { lastSyncAt, isSyncing, triggerSync, error };
}
