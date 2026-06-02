"use client";

import { use } from "react";
import { Header } from "@/components/layout/Header";
import { AccountDetailView } from "@/components/account/AccountDetailView";
import { useSync } from "@/hooks/useSync";

export default function AccountPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = use(params);
  const { lastSyncAt, isSyncing, triggerSync } = useSync();

  return (
    <div className="min-h-screen">
      <Header
        lastSyncAt={lastSyncAt}
        isSyncing={isSyncing}
        onSync={triggerSync}
      />
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <AccountDetailView domain={decodeURIComponent(domain)} />
      </main>
    </div>
  );
}
