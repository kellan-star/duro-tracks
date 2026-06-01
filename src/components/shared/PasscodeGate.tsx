"use client";

import { useEffect, useState } from "react";
import { Logo } from "./Logo";

const STORAGE_KEY = "duro-tracks-auth";
const PASSCODE = process.env.NEXT_PUBLIC_APP_PASSCODE || "duro";

export function PasscodeGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setAuthed(sessionStorage.getItem(STORAGE_KEY) === "1");
    setReady(true);
  }, []);

  if (!ready) return null;
  if (authed) return <>{children}</>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value === PASSCODE) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setAuthed(true);
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
      <form onSubmit={submit} className="card w-[320px] p-6">
        <div className="mb-5 flex justify-center">
          <Logo size={26} />
        </div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Passcode
        </label>
        <input
          autoFocus
          type="password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          className="w-full rounded-md border border-[var(--border-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
          placeholder="Enter passcode"
        />
        {error && <p className="mt-2 text-xs text-[var(--red-fg)]">Incorrect passcode.</p>}
        <button
          type="submit"
          className="mt-4 w-full rounded-md bg-[var(--brand)] py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Unlock
        </button>
      </form>
    </div>
  );
}
