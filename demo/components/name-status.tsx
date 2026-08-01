"use client";

import { useState } from "react";

import type { NameOwnershipStatus } from "@/lib/suins/ownership";

interface CheckResult {
  status: NameOwnershipStatus;
  normalizedName: string | null;
  nftId: string | null;
  expirationTimestampMs: number | null;
  checkedAt: string;
}

/**
 * Every classification gets its own copy. Collapsing "we could not reach Sui" into
 * "you do not own this" is the failure mode this whole panel exists to avoid.
 */
const COPY: Record<NameOwnershipStatus, { tone: "ok" | "warn" | "bad"; text: string }> = {
  owned: { tone: "ok", text: "You hold this name's registration NFT." },
  "not-found": { tone: "warn", text: "No SuiNS record for this name." },
  expired: { tone: "warn", text: "This registration has expired." },
  "address-owner-mismatch": {
    tone: "bad",
    text: "Another address owns this name's NFT.",
  },
  "object-owned": {
    tone: "bad",
    text: "The NFT is held by another object. Not supported yet.",
  },
  shared: { tone: "bad", text: "The NFT is a shared object. Not supported yet." },
  immutable: { tone: "bad", text: "The NFT is immutable. Not supported yet." },
  "unsupported-owner": {
    tone: "bad",
    text: "Unsupported owner kind for this NFT.",
  },
  "rpc-unavailable": {
    tone: "warn",
    text: "Unable to verify right now — Sui did not answer. Try again.",
  },
  "invalid-name": { tone: "warn", text: "That is not a valid SuiNS name." },
};

export function NameStatus() {
  const [name, setName] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function check(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/names/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? `Request failed with ${response.status}`);
      }
      setResult(data as CheckResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Check failed");
    } finally {
      setBusy(false);
    }
  }

  const verdict = result ? COPY[result.status] : null;

  return (
    <section className="panel" aria-labelledby="name-title">
      <h2 className="panel-title" id="name-title">
        Name ownership
      </h2>

      <form className="field" onSubmit={check}>
        <label className="field-label" htmlFor="suins-name">
          SuiNS name
        </label>
        <div className="btn-row">
          <input
            id="suins-name"
            className="input mono"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="yourname.sui"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className="btn" disabled={busy || !name.trim()}>
            {busy ? "Checking…" : "Check"}
          </button>
        </div>
      </form>

      <div aria-live="polite">
        {verdict && result ? (
          <>
            <span className={`chip chip-${verdict.tone}`}>{result.status}</span>
            <p className="mono muted">{verdict.text}</p>
            {result.normalizedName ? (
              <p className="mono">{result.normalizedName}</p>
            ) : null}
            {result.nftId ? (
              <p className="mono muted">NFT {result.nftId}</p>
            ) : null}
            {result.expirationTimestampMs ? (
              <p className="mono muted">
                Expires{" "}
                {new Date(result.expirationTimestampMs).toLocaleDateString()}
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
