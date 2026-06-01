"use client";

import useSWR from "swr";
import type { AccountDiscoveryTabData } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useAccountDiscovery() {
  return useSWR<AccountDiscoveryTabData>("/api/account-discovery", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });
}
