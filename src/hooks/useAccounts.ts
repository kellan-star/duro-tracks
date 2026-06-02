"use client";

import useSWR from "swr";
import type { AccountsTabData } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useAccounts() {
  return useSWR<AccountsTabData>("/api/accounts", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });
}
