"use client";

import useSWR from "swr";
import type { AccountDetailData } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useAccountDetail(domain: string | null) {
  return useSWR<AccountDetailData>(
    domain ? `/api/accounts/${encodeURIComponent(domain)}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );
}
