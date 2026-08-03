"use client";

import { useCallback, useEffect, useState } from "react";

import { NameGrid, type SuiName } from "./name-grid";

type ListStatus = "loading" | "ready" | "error";

/**
 * The signed-in landing view: every SuiNS name this wallet holds, each linking to its
 * public profile. Opening a name no longer pre-creates an offchain subname — the
 * profile page renders fine without one, and the first real save creates it.
 */
export function NameWorkspace() {
  const [names, setNames] = useState<SuiName[]>([]);
  const [status, setStatus] = useState<ListStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const response = await fetch("/api/names/list");
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? `Request failed with ${response.status}`);
      }
      setNames((data.names ?? []) as SuiName[]);
      setStatus("ready");
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Could not load names");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "loading") {
    return (
      <section className="panel">
        <h2 className="panel-title">Your Sui names</h2>
        <p className="mono muted">Loading your SuiNS name NFTs…</p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="panel" aria-labelledby="error-title">
        <h2 className="panel-title" id="error-title">
          Could not load names
        </h2>
        <p className="error" role="alert">
          {error}
        </p>
        <button type="button" className="btn-secondary" onClick={load}>
          Retry
        </button>
      </section>
    );
  }

  return <NameGrid names={names} />;
}
