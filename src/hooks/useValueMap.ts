"use client";

import useSWR from "swr";
import type { ValueMapTabData } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useValueMap() {
  return useSWR<ValueMapTabData>("/api/value-map", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });
}
