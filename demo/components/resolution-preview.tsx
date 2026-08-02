"use client";

import { useCallback, useEffect, useState } from "react";

interface RecordProfile {
  fullName: string;
  addresses: Record<string, string>;
  texts: Record<string, string>;
  contenthash: string | null;
}

type PreviewStatus = "resolved" | "empty" | "error";

interface PreviewRecord {
  status: PreviewStatus;
  value: string | null;
  error?: string;
}

interface RecordPreview {
  ensName: string;
  resolvedAt: string;
  ethAddress: PreviewRecord;
  suiAddress: PreviewRecord;
  texts: Record<string, PreviewRecord>;
  contenthash: PreviewRecord;
}

interface PreviewResponse {
  profile: RecordProfile | null;
  preview: RecordPreview;
}

interface ResolutionPreviewProps {
  /** The exact name this app confirmed the session wallet owns. */
  suiName: string;
}

const ETH_COIN_TYPE = "60";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Could not load the preview";
}

function resolvedCopy(record: PreviewRecord): string {
  if (record.status === "resolved") return record.value ?? "";
  if (record.status === "empty") return "not resolvable yet";
  return record.error ?? "resolution failed";
}

/**
 * Shows what was just saved next to what mainnet ENS actually resolves right now,
 * through the real `onsui.eth` resolver and its CCIP-Read gateway. Propagation lag
 * between the two is expected and labelled — it is not an error state.
 */
export function ResolutionPreview({ suiName }: ResolutionPreviewProps) {
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/preview?name=${encodeURIComponent(suiName)}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? `Request failed with ${response.status}`);
      }
      setData(body as PreviewResponse);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }, [suiName]);

  useEffect(() => {
    load();
  }, [load]);

  const savedEthAddress = data?.profile?.addresses[ETH_COIN_TYPE] ?? null;
  const textKeys = data?.profile ? Object.keys(data.profile.texts) : [];

  return (
    <section className="panel" aria-labelledby="preview-title">
      <h2 className="panel-title" id="preview-title">
        Live resolution preview
      </h2>
      <p className="mono muted">
        Resolved through the real <span className="mono">onsui.eth</span> resolver.
        A saved value can lag briefly before it resolves — that is expected, not a
        failure.
      </p>

      <div className="btn-row">
        <button type="button" className="btn-secondary" onClick={load} disabled={busy}>
          {busy ? "Resolving…" : "Refresh"}
        </button>
        {data ? (
          <span className="mono muted">
            Resolved via ENS at {new Date(data.preview.resolvedAt).toLocaleTimeString()}
          </span>
        ) : null}
      </div>

      <div aria-live="polite">
        {data ? (
          <>
            <PreviewRow
              label="Ethereum address"
              saved={savedEthAddress ?? "not set"}
              resolved={resolvedCopy(data.preview.ethAddress)}
            />
            <PreviewRow
              label="Sui address (SuiNS, coin 784)"
              saved="managed by SuiNS, not editable here"
              resolved={resolvedCopy(data.preview.suiAddress)}
            />
            {textKeys.map((key) => (
              <PreviewRow
                key={key}
                label={key}
                saved={data.profile?.texts[key] ?? ""}
                resolved={resolvedCopy(data.preview.texts[key])}
              />
            ))}
          </>
        ) : (
          <p className="mono muted">{busy ? "Resolving…" : "No preview yet."}</p>
        )}
      </div>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function PreviewRow({
  label,
  saved,
  resolved,
}: {
  label: string;
  saved: string;
  resolved: string;
}) {
  return (
    <div className="preview-row">
      <span className="field-label">{label}</span>
      <p className="mono muted">saved: {saved}</p>
      <p className="mono">resolved: {resolved}</p>
    </div>
  );
}
