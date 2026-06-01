"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccountDetail } from "@/hooks/use-data";
import { PasscodeGate } from "@/components/shared/PasscodeGate";
import { Logo } from "@/components/shared/Logo";
import { Avatar } from "@/components/shared/Avatar";
import { CoveragePill } from "@/components/shared/CoveragePill";
import {
  DISCOVERY_QUESTIONS,
  MEDDPICC_CATEGORIES,
  VALUE_MAP_APPS,
  VALUE_MAP_DIMENSIONS,
} from "@/lib/types";

function fmtDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Answer({ value }: { value: string }) {
  if (!value || !value.trim()) {
    return <p className="text-[12px] italic text-[var(--text-subtle)]">Not discussed</p>;
  }
  return <p className="text-[13px] leading-snug">{value}</p>;
}

export default function AccountDetailPage() {
  const params = useParams<{ domain: string }>();
  const domain = decodeURIComponent(params.domain);
  const { data, isLoading, error } = useAccountDetail(domain);

  return (
    <PasscodeGate>
      <div className="min-h-screen">
        <header className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-3">
            <Link href="/"><Logo /></Link>
            <Link href="/" className="text-[13px] font-medium text-[var(--brand)]">← All accounts</Link>
          </div>
        </header>

        <main className="mx-auto max-w-[1180px] px-5 py-5">
          {isLoading && <p className="text-[var(--text-muted)]">Loading…</p>}
          {error && <p className="text-[var(--red-fg)]">Failed to load account.</p>}
          {data && !("error" in data) && (
            <>
              {/* Account header */}
              <div className="card mb-5 p-5">
                <div className="flex items-center gap-3">
                  <Avatar name={data.company} size={40} />
                  <div>
                    <h1 className="text-[20px] font-semibold leading-tight">{data.company}</h1>
                    <p className="text-[13px] text-[var(--text-muted)]">{data.domain}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 text-[13px]">
                  <Meta label="Lead Rep" value={data.leadRep ?? "—"} />
                  <Meta label="Calls" value={String(data.callCount)} />
                  <Meta label="Transcripts" value={String(data.transcriptCount)} />
                  <Meta label="Account Discovery" value={<CoveragePill score={data.scores.discovery} />} />
                  <Meta label="Value Map" value={<CoveragePill score={data.scores.valueMap} />} />
                  <Meta label="MEDDPICC" value={<CoveragePill score={data.scores.meddpicc} />} />
                </div>
              </div>

              {/* Account Discovery */}
              <Section title="Account Discovery">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {DISCOVERY_QUESTIONS.map((q) => (
                    <div key={q.key} className="card p-4">
                      <h3 className="text-[13px] font-semibold">{q.label}</h3>
                      <p className="mb-2 text-[11px] text-[var(--text-muted)]">{q.description}</p>
                      <Answer value={data.analysis?.discovery?.[q.key] ?? ""} />
                    </div>
                  ))}
                </div>
              </Section>

              {/* Value Map */}
              <Section title="Value Map">
                <div className="card overflow-hidden">
                  <div className="grid grid-cols-[120px_repeat(3,1fr)] border-b border-[var(--border)] bg-[var(--bg)]">
                    <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      App / Portal
                    </div>
                    {VALUE_MAP_DIMENSIONS.map((d) => (
                      <div key={d.key} className="border-l border-[var(--border)] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                        {d.label}
                      </div>
                    ))}
                  </div>
                  {VALUE_MAP_APPS.map((app) => (
                    <div key={app} className="grid grid-cols-[120px_repeat(3,1fr)]">
                      <div className="px-4 py-4 text-[13px] font-semibold">{app}</div>
                      {VALUE_MAP_DIMENSIONS.map((d) => (
                        <div key={d.key} className="border-l border-[var(--border)] px-4 py-4">
                          <Answer value={data.analysis?.valueMap?.[app]?.[d.key] ?? ""} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </Section>

              {/* MEDDPICC */}
              <Section title="MEDDPICC">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {MEDDPICC_CATEGORIES.map((c) => (
                    <div key={c.key} className="card p-4">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[var(--brand-soft)] text-[11px] font-bold text-[var(--brand-ink)]">
                          {c.letter}
                        </span>
                        <h3 className="text-[13px] font-semibold">{c.label}</h3>
                      </div>
                      <p className="mb-2 text-[11px] text-[var(--text-muted)]">{c.description}</p>
                      <Answer value={data.analysis?.meddpicc?.[c.key] ?? ""} />
                    </div>
                  ))}
                </div>
              </Section>

              {/* Call History */}
              <Section title="Call History">
                <div className="card overflow-hidden">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Subject</th>
                        <th>Reps</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.calls.length === 0 && (
                        <tr><td colSpan={3} className="text-center text-[var(--text-muted)]">No calls.</td></tr>
                      )}
                      {data.calls.map((c) => (
                        <tr key={c.id}>
                          <td className="text-[var(--text-muted)]">{fmtDate(c.startTime)}</td>
                          <td className="font-medium">{c.subject}</td>
                          <td>{c.reps.length ? c.reps.join(", ") : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </>
          )}
        </main>
      </div>
    </PasscodeGate>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </span>
      <span className="text-[13px] font-medium">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2.5 text-[15px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}
