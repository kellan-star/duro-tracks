import type { ValueMap } from "@/lib/types";
import {
  VALUE_MAP_APP_KEYS,
  VALUE_MAP_APP_LABELS,
  VALUE_MAP_COLUMN_KEYS,
  VALUE_MAP_COLUMN_LABELS,
} from "@/lib/types";

interface Props {
  data: ValueMap;
}

export function ValueMapSection({ data }: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Value Map</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-sm font-semibold text-slate-700 p-2 w-36">
                App / Portal
              </th>
              {VALUE_MAP_COLUMN_KEYS.map((col) => (
                <th
                  key={col}
                  className="text-left text-sm font-semibold text-slate-700 p-2"
                >
                  {VALUE_MAP_COLUMN_LABELS[col]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VALUE_MAP_APP_KEYS.map((appKey) => (
              <tr key={appKey} className="border-t border-slate-200">
                <td className="text-sm font-medium text-slate-900 p-2 align-top whitespace-nowrap">
                  {VALUE_MAP_APP_LABELS[appKey]}
                </td>
                {VALUE_MAP_COLUMN_KEYS.map((colKey) => {
                  const text = data[appKey]?.[colKey];
                  return (
                    <td key={colKey} className="p-2 align-top">
                      <div className="bg-white rounded-lg border border-slate-200 p-3 min-h-[60px]">
                        {text?.trim() ? (
                          <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                            {text}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No data</p>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
