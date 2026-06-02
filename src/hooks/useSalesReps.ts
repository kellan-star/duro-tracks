"use client";

import useSWR from "swr";
import type { SalesRepsTabData } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSalesReps() {
  return useSWR<SalesRepsTabData>("/api/sales-reps", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });
}
