"use client";

import Link from "next/link";
import { useAccountDetail } from "@/hooks/useAccountDetail";
import { AccountDiscoverySection } from "./AccountDiscoverySection";
import { ValueMapSection } from "./ValueMapSection";
import { MeddpiccSection } from "./MeddpiccSection";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { accountDiscoveryScore, valueMapScore, meddpiccScore } from "@/lib/types";

interface Props {
  domain: string;
}

export function AccountDetailView({ domain }: Props) {
  const { data, isLoading, error } = useAccountDetail(domain);

  if (isLoading) {
    return <div className="text-sm text-slate-400">Loading account...</div>;
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 font-medium">Account not found</p>
        <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { account, calls } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
          &larr; Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">
          {account.companyName}
        </h1>
        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500">
          <span>{account.domain}</span>
          <span>Lead Rep: {account.leadRepName || "—"}</span>
          <span>{account.callCount} calls</span>
          <span>{account.transcriptCount} transcripts</span>
        </div>
        <div className="flex gap-3 mt-3">
          <ScoreBadge score={accountDiscoveryScore(account.accountDiscovery)} label="AD" />
          <ScoreBadge score={valueMapScore(account.valueMap)} label="VM" />
          <ScoreBadge score={meddpiccScore(account.meddpicc)} label="MP" />
        </div>
      </div>

      {/* Framework sections */}
      <AccountDiscoverySection data={account.accountDiscovery} />
      <ValueMapSection data={account.valueMap} />
      <MeddpiccSection data={account.meddpicc} />

      {/* Call History */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Call History</h2>
        {calls.length === 0 ? (
          <p className="text-sm text-slate-400">No calls recorded</p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Subject</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Reps</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => (
                  <tr key={call.meetingUuid} className="border-b border-slate-100">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(call.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{call.subject || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{call.reps.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
