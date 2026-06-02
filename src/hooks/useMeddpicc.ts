"use client";

import useSWR from "swr";
import type { MeddpiccTabData } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useMeddpicc() {
  return useSWR<MeddpiccTabData>("/api/meddpicc", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });
}
