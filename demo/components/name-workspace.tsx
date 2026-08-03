"use client";

import { useCallback, useEffect, useState } from "react";

import type { Session } from "@/lib/auth/session";

import { NameGrid, type SuiName } from "./name-grid";
import { ProfilePanel } from "./profile-panel";

type ListStatus = "loading" | "ready" | "error";
type CreateStatus = "idle" | "pending" | "error";

interface NameWorkspaceProps {
  session: Session;
}

async function postJson(
  url: string,
  body?: unknown,
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? `Request failed with ${response.status}`);
  }
  return data;
}

export function NameWorkspace({ session }: NameWorkspaceProps) {
  const [names, setNames] = useState<SuiName[]>([]);
  const [listStatus, setListStatus] = useState<ListStatus>("loading");
  const [listError, setListError] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<SuiName | null>(null);
  const [createStatus, setCreateStatus] = useState<CreateStatus>("idle");
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setListStatus("loading");
    setListError(null);
    try {
      const response = await fetch("/api/names/list");
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? `Request failed with ${response.status}`);
      }
      const list = (data.names ?? []) as SuiName[];
      setNames(list);
      setListStatus("ready");
    } catch (caught) {
      setListStatus("error");
      setListError(caught instanceof Error ? caught.message : "Could not load names");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function selectName(name: SuiName) {
    setCreateStatus("pending");
    setCreateError(null);
    try {
      const readResponse = await fetch(`/api/records?name=${encodeURIComponent(name.name)}`);
      const existing = await readResponse.json().catch(() => null);
      if (!readResponse.ok) {
        throw new Error(existing?.error ?? `Request failed with ${readResponse.status}`);
      }

      if (existing === null) {
        await postJson("/api/records", {
          suiName: name.name,
          addresses: [],
          texts: [],
        });
      }

      setSelectedName(name);
      setCreateStatus("idle");
    } catch (caught) {
      setCreateStatus("error");
      setCreateError(caught instanceof Error ? caught.message : "Could not open name");
    }
  }

  if (selectedName) {
    return (
      <ProfilePanel
        name={selectedName}
        suiAddress={session.suiAddress}
        onBack={() => setSelectedName(null)}
      />
    );
  }

  return (
    <>
      {listStatus === "loading" ? (
        <section className="panel">
          <h2 className="panel-title">Your Sui names</h2>
          <p className="mono muted">Loading your SuiNS name NFTs…</p>
        </section>
      ) : listStatus === "error" ? (
        <section className="panel" aria-labelledby="error-title">
          <h2 className="panel-title" id="error-title">Could not load names</h2>
          <p className="error" role="alert">
            {listError}
          </p>
          <button type="button" className="btn-secondary" onClick={load}>
            Retry
          </button>
        </section>
      ) : (
        <NameGrid
          names={names}
          onSelect={selectName}
          disabled={createStatus === "pending"}
        />
      )}

      {createStatus === "pending" ? (
        <p className="mono muted" aria-live="polite">
          Creating offchain subname…
        </p>
      ) : null}
      {createStatus === "error" ? (
        <p className="error" role="alert">
          {createError}
        </p>
      ) : null}
    </>
  );
}
