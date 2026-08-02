"use client";

import { ChainName, validateAddress } from "@thenamespace/offchain-manager";
import { useState } from "react";

interface RecordProfile {
  fullName: string;
  addresses: Record<string, string>;
  texts: Record<string, string>;
  contenthash: string | null;
}

interface RecordEditorProps {
  /** The exact name this app just confirmed the session wallet owns. */
  suiName: string;
}

type Status = "idle" | "pending" | "success" | "failure" | "unable-to-verify";

interface AddressRow {
  chain: ChainName;
  value: string;
}

interface TextRow {
  key: string;
  value: string;
}

const SUPPORTED_CHAINS = Object.values(ChainName);

/** Keys the gateway always serves from SuiNS; see `demo/lib/namespace/schema.ts`. */
const RESERVED_TEXT_KEYS = new Set(["org.suins.name", "walrus", "walrusSiteId"]);

function addressRowError(row: AddressRow): string | null {
  if (!row.value.trim()) return null;
  try {
    validateAddress(row.value.trim(), row.chain);
    return null;
  } catch {
    return `Not a valid ${row.chain} address`;
  }
}

function textRowError(row: TextRow): string | null {
  if (!row.key.trim()) return null;
  return RESERVED_TEXT_KEYS.has(row.key.trim())
    ? "This key is reserved for Sui-native data"
    : null;
}

let rowId = 0;
function nextRowId(): number {
  rowId += 1;
  return rowId;
}

/**
 * "unable to verify ownership" is kept visually and semantically distinct from a
 * hard failure: the wallet session is still valid, Sui just did not answer in time,
 * and retrying is the correct next action rather than treating this as rejected.
 */
export function RecordEditor({ suiName }: RecordEditorProps) {
  const [addresses, setAddresses] = useState<(AddressRow & { id: number })[]>([]);
  const [texts, setTexts] = useState<(TextRow & { id: number })[]>([]);
  const [contenthash, setContenthash] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<RecordProfile | null>(null);

  function addAddressRow() {
    setAddresses((rows) => [...rows, { id: nextRowId(), chain: ChainName.Ethereum, value: "" }]);
  }

  function removeAddressRow(id: number) {
    setAddresses((rows) => rows.filter((row) => row.id !== id));
  }

  function updateAddressRow(id: number, patch: Partial<AddressRow>) {
    setAddresses((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addTextRow() {
    setTexts((rows) => [...rows, { id: nextRowId(), key: "", value: "" }]);
  }

  function removeTextRow(id: number) {
    setTexts((rows) => rows.filter((row) => row.id !== id));
  }

  function updateTextRow(id: number, patch: Partial<TextRow>) {
    setTexts((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  const hasRowErrors =
    addresses.some((row) => addressRowError(row)) || texts.some((row) => textRowError(row));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (hasRowErrors) return;

    setStatus("pending");
    setMessage(null);

    try {
      const response = await fetch("/api/records", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          suiName,
          addresses: addresses
            .filter((row) => row.value.trim())
            .map(({ chain, value }) => ({ chain, value: value.trim() })),
          texts: texts
            .filter((row) => row.key.trim())
            .map(({ key, value }) => ({ key: key.trim(), value })),
          contenthash: contenthash.trim() || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 503) {
          setStatus("unable-to-verify");
          setMessage(data.error ?? "Unable to verify ownership right now.");
          return;
        }
        throw new Error(data.error ?? `Request failed with ${response.status}`);
      }

      setProfile(data as RecordProfile);
      setStatus("success");
    } catch (caught) {
      setStatus("failure");
      setMessage(caught instanceof Error ? caught.message : "Save failed");
    }
  }

  const pending = status === "pending";
  const retrying = status === "unable-to-verify";

  return (
    <section className="panel" aria-labelledby="records-title">
      <h2 className="panel-title" id="records-title">
        Records
      </h2>
      <p className="mono muted">
        Saved to <span className="mono">{suiName}</span> on label.onsui.eth
        through Namespace. Ownership is rechecked on every save.
      </p>

      <form className="field" onSubmit={save}>
        <fieldset className="field">
          <legend className="field-label">Addresses</legend>
          {addresses.map((row) => {
            const rowError = addressRowError(row);
            return (
              <div key={row.id}>
                <div className="btn-row">
                  <select
                    className="input mono"
                    style={{ maxWidth: 140, flex: "0 0 auto" }}
                    value={row.chain}
                    onChange={(event) =>
                      updateAddressRow(row.id, { chain: event.target.value as ChainName })
                    }
                    aria-label="Chain"
                  >
                    {SUPPORTED_CHAINS.map((chain) => (
                      <option key={chain} value={chain}>
                        {chain}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input mono"
                    value={row.value}
                    onChange={(event) => updateAddressRow(row.id, { value: event.target.value })}
                    placeholder="Address"
                    autoComplete="off"
                    spellCheck={false}
                    aria-label={`${row.chain} address`}
                    aria-invalid={rowError ? true : undefined}
                    aria-describedby={rowError ? `address-error-${row.id}` : undefined}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => removeAddressRow(row.id)}
                  >
                    Remove
                  </button>
                </div>
                {rowError ? (
                  <p className="mono muted" role="alert" id={`address-error-${row.id}`}>
                    {rowError}
                  </p>
                ) : null}
              </div>
            );
          })}
          <button type="button" className="btn-secondary" onClick={addAddressRow}>
            + Add address
          </button>
        </fieldset>

        <fieldset className="field">
          <legend className="field-label">Text records</legend>
          {texts.map((row) => {
            const rowError = textRowError(row);
            return (
              <div key={row.id}>
                <div className="btn-row">
                  <input
                    className="input mono"
                    style={{ maxWidth: 180 }}
                    value={row.key}
                    onChange={(event) => updateTextRow(row.id, { key: event.target.value })}
                    placeholder="com.twitter"
                    autoComplete="off"
                    spellCheck={false}
                    aria-label="Text record key"
                    aria-invalid={rowError ? true : undefined}
                    aria-describedby={rowError ? `text-error-${row.id}` : undefined}
                  />
                  <input
                    className="input mono"
                    value={row.value}
                    onChange={(event) => updateTextRow(row.id, { value: event.target.value })}
                    placeholder="Value"
                    autoComplete="off"
                    aria-label={`Value for ${row.key || "text record"}`}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => removeTextRow(row.id)}
                  >
                    Remove
                  </button>
                </div>
                {rowError ? (
                  <p className="mono muted" role="alert" id={`text-error-${row.id}`}>
                    {rowError}
                  </p>
                ) : null}
              </div>
            );
          })}
          <button type="button" className="btn-secondary" onClick={addTextRow}>
            + Add text record
          </button>
        </fieldset>

        <div className="field">
          <label className="field-label" htmlFor="record-contenthash">
            Contenthash (IPFS CID)
          </label>
          <input
            id="record-contenthash"
            className="input mono"
            value={contenthash}
            onChange={(event) => setContenthash(event.target.value)}
            placeholder="bafy… or Qm…"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="btn-row">
          <button type="submit" className="btn" disabled={pending || hasRowErrors}>
            {pending ? "Saving…" : retrying ? "Retry" : "Save"}
          </button>
        </div>
      </form>

      <div aria-live="polite">
        {status === "success" && profile ? (
          <>
            <span className="chip chip-ok">saved</span>
            <p className="mono">{profile.fullName}</p>
            {Object.entries(profile.addresses).map(([chain, value]) => (
              <p className="mono muted" key={chain}>
                {chain}: {value}
              </p>
            ))}
            {Object.entries(profile.texts).map(([key, value]) => (
              <p className="mono muted" key={key}>
                {key}: {value}
              </p>
            ))}
            <p className="mono muted">
              contenthash: {profile.contenthash ?? "not set"}
            </p>
          </>
        ) : null}
      </div>

      {retrying || status === "failure" ? (
        <p className="error" role="alert">
          {message}
        </p>
      ) : null}
    </section>
  );
}
