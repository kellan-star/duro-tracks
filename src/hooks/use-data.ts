"use client";

import useSWR from "swr";
import type {
  AccountDetail,
  AccountRow,
  DiscoveryInsights,
  Kpis,
  MeddpiccInsights,
  RepRow,
  ValueMapInsights,
} from "@/lib/types";
import type { SyncProgress } from "@/lib/sync-engine";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useKpis() {
  return useSWR<Kpis>("/api/kpis", fetcher, { refreshInterval: 0 });
}

export function useAccounts() {
  return useSWR<{ accounts: AccountRow[] }>("/api/accounts", fetcher);
}

export function useReps() {
  return useSWR<{ reps: RepRow[] }>("/api/reps", fetcher);
}

export function useAccountDetail(domain: string) {
  return useSWR<AccountDetail>(`/api/account/${encodeURIComponent(domain)}`, fetcher);
}

export function useDiscoveryInsights() {
  return useSWR<{ insights: DiscoveryInsights }>("/api/insights/discovery", fetcher);
}
export function useValueMapInsights() {
  return useSWR<{ insights: ValueMapInsights }>("/api/insights/valuemap", fetcher);
}
export function useMeddpiccInsights() {
  return useSWR<{ insights: MeddpiccInsights }>("/api/insights/meddpicc", fetcher);
}

export function useProgress(enabled: boolean) {
  return useSWR<SyncProgress>(enabled ? "/api/progress" : null, fetcher, {
    refreshInterval: enabled ? 1500 : 0,
  });
}
