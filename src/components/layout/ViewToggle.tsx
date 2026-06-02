"use client";

import type { TabId } from "@/lib/types";

interface ViewToggleProps {
  view: TabId;
  onViewChange: (view: TabId) => void;
}

const tabs: Array<{ value: TabId; label: string; icon: React.ReactNode }> = [
  {
    value: "accounts",
    label: "Accounts",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2.5" y="3.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M2.5 6.5h11M5.5 9h2M5.5 11h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: "salesReps",
    label: "Sales Reps",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5.5" r="2.3" stroke="currentColor" strokeWidth="1.3" />
        <path d="M3 13c0-2.5 2.2-4 5-4s5 1.5 5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: "accountDiscovery",
    label: "Account Discovery",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.3" />
        <path d="m13 13-3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: "valueMap",
    label: "Value Map",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
        <rect x="9" y="2.5" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
        <rect x="2.5" y="9" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
        <rect x="9" y="9" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
  },
  {
    value: "meddpicc",
    label: "MEDDPICC",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 3v10M3 3l5 4 5-4v10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="tabs-container">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onViewChange(tab.value)}
          className={`tab-btn ${view === tab.value ? "tab-btn-active" : ""}`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
