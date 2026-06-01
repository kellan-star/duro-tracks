"use client";

import { useState, useEffect } from "react";

const PASSCODE = "0526";
const STORAGE_KEY = "tt_auth";

export function PasscodeGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (sessionStorage.getItem(STORAGE_KEY) === "1") {
      setAuthenticated(true);
    }
  }, []);

  if (!mounted) return null;

  if (authenticated) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === PASSCODE) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setAuthenticated(true);
    } else {
      setError(true);
      setCode("");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)", padding: "40px 48px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 24,
        boxShadow: "var(--shadow-sm)", maxWidth: 360, width: "100%",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="tt-mark lg" aria-hidden="true" />
          <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.015em" }}>Duro Tracks</span>
        </div>

        <p style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", margin: 0 }}>
          Enter passcode to continue
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={code}
            onChange={(e) => {
              setError(false);
              setCode(e.target.value.replace(/\D/g, "").slice(0, 4));
            }}
            placeholder="••••"
            autoFocus
            style={{
              width: "100%", height: 44, textAlign: "center",
              fontSize: 20, fontWeight: 600, letterSpacing: "0.3em",
              border: `1px solid ${error ? "var(--bad-border)" : "var(--border-strong)"}`,
              borderRadius: "var(--r)", outline: "none",
              background: error ? "var(--bad-bg)" : "var(--surface)",
              color: "var(--text)",
            }}
          />
          {error && (
            <p style={{ fontSize: 12, color: "var(--bad-fg)", textAlign: "center", margin: 0 }}>
              Incorrect passcode
            </p>
          )}
          <button
            type="submit"
            className="sync-btn"
            style={{ width: "100%", justifyContent: "center", height: 38 }}
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
