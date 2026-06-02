"use client";

import { useState, useEffect } from "react";

export function Spinner() {
  const [progress, setProgress] = useState<{
    stage: string;
    detail: string;
    percent: number;
    elapsedSeconds: number;
  } | null>(null);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/progress");
        if (res.ok && active) {
          const data = await res.json();
          if (data.stage !== "idle") {
            setProgress(data);
          }
        }
      } catch {
        // ignore
      }
    };
    poll();
    const interval = setInterval(poll, 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      {progress && progress.stage !== "idle" && (
        <div className="text-center space-y-2 max-w-md">
          <p className="text-sm font-medium text-slate-700">{progress.stage}</p>
          <p className="text-xs text-slate-500">{progress.detail}</p>
          <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">{progress.elapsedSeconds}s elapsed</p>
        </div>
      )}
    </div>
  );
}
