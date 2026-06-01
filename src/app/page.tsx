"use client";

import { useState } from "react";
import { PasscodeGate } from "@/components/shared/PasscodeGate";
import { Logo } from "@/components/shared/Logo";
import { SyncButton } from "@/components/SyncButton";
import { AutoSync } from "@/components/AutoSync";
import { KpiStrip } from "@/components/KpiStrip";
import { AccountsTab } from "@/components/tabs/AccountsTab";
import { RepsTab } from "@/components/tabs/RepsTab";
import { DiscoveryInsightsTab } from "@/components/tabs/DiscoveryInsightsTab";
import { ValueMapInsightsTab } from "@/components/tabs/ValueMapInsightsTab";
import { MeddpiccInsightsTab } from "@/components/tabs/MeddpiccInsightsTab";

const TABS = [
  { key: "accounts", label: "Accounts" },
  { key: "reps", label: "Sales Reps" },
  { key: "discovery", label: "Account Discovery" },
  { key: "valuemap", label: "Value Map" },
  { key: "meddpicc", label: "MEDDPICC" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function Home() {
  const [tab, setTab] = useState<TabKey>("accounts");

  return (
    <PasscodeGate>
      <AutoSync />
      <div className="min-h-screen">
        {/* Header */}
        <header className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-3">
            <Logo />
            <SyncButton />
          </div>
        </header>

        {/* Tab navigation */}
        <nav className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto flex max-w-[1180px] gap-1 px-5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="relative px-3 py-2.5 text-[13px] font-medium"
                style={{ color: tab === t.key ? "var(--text)" : "var(--text-muted)" }}
              >
                {t.label}
                {tab === t.key && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-[var(--brand)]" />
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* KPI strip */}
        <KpiStrip />

        {/* Content */}
        <main className="mx-auto max-w-[1180px] px-5 py-5">
          {tab === "accounts" && <AccountsTab />}
          {tab === "reps" && <RepsTab />}
          {tab === "discovery" && <DiscoveryInsightsTab />}
          {tab === "valuemap" && <ValueMapInsightsTab />}
          {tab === "meddpicc" && <MeddpiccInsightsTab />}
        </main>
      </div>
    </PasscodeGate>
  );
}
