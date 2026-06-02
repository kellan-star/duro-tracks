"use client";

import { useState } from "react";
import type { TabId } from "@/lib/types";
import { Header } from "@/components/layout/Header";
import { ViewToggle } from "@/components/layout/ViewToggle";
import { KpiStrip } from "@/components/shared/KpiStrip";
import { AccountsTab } from "@/components/tabs/AccountsTab";
import { SalesRepsTab } from "@/components/tabs/SalesRepsTab";
import { AccountDiscoveryTab } from "@/components/tabs/AccountDiscoveryTab";
import { ValueMapTab } from "@/components/tabs/ValueMapTab";
import { MeddpiccTab } from "@/components/tabs/MeddpiccTab";
import { Spinner } from "@/components/ui/Spinner";
import { useSync } from "@/hooks/useSync";

export default function Home() {
  const [view, setView] = useState<TabId>("accounts");
  const { lastSyncAt, isSyncing, triggerSync } = useSync();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Header
        lastSyncAt={lastSyncAt}
        isSyncing={isSyncing}
        onSync={triggerSync}
      />

      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 18, borderBottom: "1px solid var(--border)" }}>
          <ViewToggle view={view} onViewChange={setView} />
        </div>

        <div style={{ marginTop: 18, marginBottom: 20 }}>
          <KpiStrip />
        </div>
      </div>

      <div className="page" style={{ paddingTop: 0 }}>
        {isSyncing ? (
          <Spinner />
        ) : (
          <>
            {view === "accounts" && <AccountsTab />}
            {view === "salesReps" && <SalesRepsTab />}
            {view === "accountDiscovery" && <AccountDiscoveryTab />}
            {view === "valueMap" && <ValueMapTab />}
            {view === "meddpicc" && <MeddpiccTab />}
          </>
        )}
      </div>
    </div>
  );
}
