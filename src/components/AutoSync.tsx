"use client";

import { useEffect, useRef } from "react";

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // re-check every 5 minutes

/** The most recent 6:00am America/New_York instant that has already passed. */
function lastSixAmEt(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const etHour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  // Anchor to "today" in ET; if it's before 6am ET, the threshold is yesterday's.
  const sixAm = new Date(now);
  sixAm.setHours(sixAm.getHours() - etHour + 6, 0, 0, 0);
  if (now < sixAm) sixAm.setDate(sixAm.getDate() - 1);
  return sixAm;
}

/**
 * While the dashboard is open, automatically triggers a sync once per day after
 * 6am ET (if no sync has happened since the most recent 6am ET).
 */
export function AutoSync() {
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (inFlight.current) return;
      try {
        const status = await fetch("/api/sync").then((r) => r.json());
        if (cancelled || status.running) return;
        const threshold = lastSixAmEt();
        const last = status.lastSync ? new Date(status.lastSync) : null;
        if (!last || last < threshold) {
          inFlight.current = true;
          await fetch("/api/sync", { method: "POST" });
          inFlight.current = false;
        }
      } catch {
        inFlight.current = false;
      }
    };

    check();
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return null;
}
