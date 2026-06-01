import type { InsightEntry } from "@/lib/types";

interface InsightPanelProps {
  title: string;
  entries: InsightEntry[];
  accountCount: number;
}

export function InsightPanel({ title, entries, accountCount }: InsightPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="text-xs text-slate-400">
          {accountCount} account{accountCount !== 1 ? "s" : ""}
        </span>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No data yet</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.accountDomain} className="text-sm">
              <span className="font-medium text-slate-700">
                {entry.companyName}
              </span>
              <p className="text-slate-600 mt-0.5 whitespace-pre-wrap text-xs leading-relaxed">
                {entry.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
