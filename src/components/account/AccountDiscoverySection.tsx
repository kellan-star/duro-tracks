import type { AccountDiscovery } from "@/lib/types";
import { ACCOUNT_DISCOVERY_KEYS, ACCOUNT_DISCOVERY_LABELS } from "@/lib/types";

interface Props {
  data: AccountDiscovery;
}

export function AccountDiscoverySection({ data }: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Account Discovery</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ACCOUNT_DISCOVERY_KEYS.map((key) => (
          <div key={key} className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              {ACCOUNT_DISCOVERY_LABELS[key]}
            </h3>
            {data[key]?.trim() ? (
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                {data[key]}
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic">No data</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
