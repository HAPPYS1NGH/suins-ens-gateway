"use client";

import { ChainName, validateAddress } from "@thenamespace/offchain-manager";
import { useCallback, useEffect, useRef, useState } from "react";

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

type SaveStatus = "idle" | "pending" | "success" | "failure" | "unable-to-verify";
type LoadStatus = "loading" | "ready" | "error";
type RowOrigin = "existing" | "new";

interface AddressRow {
  id: number;
  chain: ChainName;
  value: string;
  origin: RowOrigin;
  originalChain: ChainName | null;
  leaving: boolean;
}

interface TextRow {
  id: number;
  key: string;
  value: string;
  customKey: boolean;
  origin: RowOrigin;
  originalKey: string | null;
  leaving: boolean;
}

const CHAIN_LABELS: Record<ChainName, string> = {
  [ChainName.Ethereum]: "Ethereum",
  [ChainName.Default]: "Default",
  [ChainName.Solana]: "Solana",
  [ChainName.Arbitrum]: "Arbitrum",
  [ChainName.Optimism]: "Optimism",
  [ChainName.Base]: "Base",
  [ChainName.Polygon]: "Polygon",
  [ChainName.Bsc]: "BNB Chain",
  [ChainName.Avalanche]: "Avalanche",
  [ChainName.Gnosis]: "Gnosis",
  [ChainName.Zksync]: "zkSync",
  [ChainName.Cosmos]: "Cosmos",
  [ChainName.Near]: "NEAR",
  [ChainName.Linea]: "Linea",
  [ChainName.Scroll]: "Scroll",
  [ChainName.Bitcoin]: "Bitcoin",
  [ChainName.Starknet]: "Starknet",
  [ChainName.Sui]: "Sui",
  [ChainName.Unichain]: "Unichain",
  [ChainName.Berachain]: "Berachain",
  [ChainName.WorldChain]: "World Chain",
  [ChainName.Zora]: "Zora",
  [ChainName.Celo]: "Celo",
  [ChainName.Aptos]: "Aptos",
  [ChainName.Algorand]: "Algorand",
  [ChainName.Monad]: "Monad",
  [ChainName.Push]: "Push",
  [ChainName.Polkadot]: "Polkadot",
  [ChainName.Vara]: "Vara",
};

const POPULAR_CHAINS: ChainName[] = [
  ChainName.Ethereum,
  ChainName.Solana,
  ChainName.Bitcoin,
  ChainName.Base,
  ChainName.Polygon,
  ChainName.Arbitrum,
];

const OTHER_CHAINS = Object.values(ChainName)
  .filter((chain) => !POPULAR_CHAINS.includes(chain))
  .sort((a, b) => CHAIN_LABELS[a].localeCompare(CHAIN_LABELS[b]));

const ORDERED_CHAINS = [...POPULAR_CHAINS, ...OTHER_CHAINS];

const TEXT_KEY_PRESETS: { label: string; key: string }[] = [
  { label: "Twitter / X", key: "com.twitter" },
  { label: "GitHub", key: "com.github" },
  { label: "Discord", key: "com.discord" },
  { label: "Telegram", key: "org.telegram" },
  { label: "Website", key: "url" },
  { label: "Email", key: "email" },
  { label: "Avatar", key: "avatar" },
  { label: "Description", key: "description" },
];

const CUSTOM_KEY_VALUE = "__custom__";
const RESERVED_TEXT_KEYS = new Set(["org.suins.name", "walrus", "walrusSiteId"]);
const LEAVE_ANIMATION_MS = 150;

function isPresetKey(key: string): boolean {
  return TEXT_KEY_PRESETS.some((preset) => preset.key === key);
}

function addressRowError(row: Pick<AddressRow, "chain" | "value">): string | null {
  if (!row.value.trim()) return null;
  try {
    validateAddress(row.value.trim(), row.chain);
    return null;
  } catch {
    return `Not a valid ${row.chain} address`;
  }
}

function textRowError(row: Pick<TextRow, "key">): string | null {
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
 * hard failure. Existing records load before the form becomes usable, and removals
 * of existing rows are sent explicitly so unrelated records remain untouched.
 */
export function RecordEditor({ suiName }: RecordEditorProps) {
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  const [texts, setTexts] = useState<TextRow[]>([]);
  const [removedChains, setRemovedChains] = useState<Set<string>>(new Set());
  const [removedTextKeys, setRemovedTextKeys] = useState<Set<string>>(new Set());
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<RecordProfile | null>(null);
  const loadSequence = useRef(0);
  const saveSequence = useRef(0);
  const currentSuiName = useRef(suiName);
  currentSuiName.current = suiName;

  const hydrateProfile = useCallback((nextProfile: RecordProfile | null) => {
    setAddresses(
      Object.entries(nextProfile?.addresses ?? {}).map(([chain, value]) => ({
        id: nextRowId(),
        chain: chain as ChainName,
        value,
        origin: "existing" as const,
        originalChain: chain as ChainName,
        leaving: false,
      })),
    );
    setTexts(
      Object.entries(nextProfile?.texts ?? {}).map(([key, value]) => ({
        id: nextRowId(),
        key,
        value,
        customKey: !isPresetKey(key),
        origin: "existing" as const,
        originalKey: key,
        leaving: false,
      })),
    );
    setRemovedChains(new Set());
    setRemovedTextKeys(new Set());
  }, []);

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoadStatus("loading");
    setLoadError(null);
    try {
      const response = await fetch(`/api/records?name=${encodeURIComponent(suiName)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? `Request failed with ${response.status}`);
      if (sequence !== loadSequence.current) return;
      const existing = data as RecordProfile | null;
      hydrateProfile(existing);
      setLoadStatus("ready");
    } catch (caught) {
      if (sequence !== loadSequence.current) return;
      setLoadStatus("error");
      setLoadError(caught instanceof Error ? caught.message : "Could not load existing records");
    }
  }, [hydrateProfile, suiName]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    saveSequence.current += 1;
    setSaveStatus("idle");
    setMessage(null);
    setProfile(null);
  }, [suiName]);

  function addAddressRow() {
    setAddresses((rows) => [
      ...rows,
      { id: nextRowId(), chain: ChainName.Ethereum, value: "", origin: "new", originalChain: null, leaving: false },
    ]);
  }

  function removeAddressRow(id: number) {
    const row = addresses.find((candidate) => candidate.id === id);
    if (!row) return;
    if (row.originalChain) setRemovedChains((chains) => new Set(chains).add(row.originalChain!));
    setAddresses((rows) => rows.map((item) => (item.id === id ? { ...item, leaving: true } : item)));
    setTimeout(() => setAddresses((rows) => rows.filter((item) => item.id !== id)), LEAVE_ANIMATION_MS);
  }

  function updateAddressRow(id: number, patch: Partial<Pick<AddressRow, "chain" | "value">>) {
    setAddresses((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addTextRow() {
    setTexts((rows) => [
      ...rows,
      { id: nextRowId(), key: "", value: "", customKey: false, origin: "new", originalKey: null, leaving: false },
    ]);
  }

  function removeTextRow(id: number) {
    const row = texts.find((candidate) => candidate.id === id);
    if (!row) return;
    if (row.originalKey) setRemovedTextKeys((keys) => new Set(keys).add(row.originalKey!));
    setTexts((rows) => rows.map((item) => (item.id === id ? { ...item, leaving: true } : item)));
    setTimeout(() => setTexts((rows) => rows.filter((item) => item.id !== id)), LEAVE_ANIMATION_MS);
  }

  function updateTextRow(id: number, patch: Partial<Pick<TextRow, "key" | "value" | "customKey">>) {
    setTexts((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  const hasRowErrors =
    addresses.some((row) => !row.leaving && addressRowError(row)) ||
    texts.some((row) => !row.leaving && textRowError(row));
  const hasRecords = addresses.some((row) => !row.leaving) || texts.some((row) => !row.leaving);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (hasRowErrors || loadStatus !== "ready") return;
    const savedName = suiName;
    const sequence = ++saveSequence.current;
    const isCurrentSave = () =>
      sequence === saveSequence.current && savedName === currentSuiName.current;
    setSaveStatus("pending");
    setMessage(null);
    try {
      const addressUpserts = addresses
        .filter((row) => !row.leaving && row.value.trim())
        .map(({ chain, value }) => ({ chain, value: value.trim() }));
      const textUpserts = texts
        .filter((row) => !row.leaving && row.key.trim())
        .map(({ key, value }) => ({ key: key.trim(), value }));
      const addressRemovals = new Set(removedChains);
      const textRemovals = new Set(removedTextKeys);
      addresses.forEach((row) => {
        if (!row.leaving && row.originalChain && row.originalChain !== row.chain) {
          addressRemovals.add(row.originalChain);
        }
      });
      texts.forEach((row) => {
        if (!row.leaving && row.originalKey && row.originalKey !== row.key.trim()) {
          textRemovals.add(row.originalKey);
        }
      });
      addressUpserts.forEach(({ chain }) => addressRemovals.delete(chain));
      textUpserts.forEach(({ key }) => textRemovals.delete(key));
      const response = await fetch("/api/records", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          suiName,
          addresses: addressUpserts,
          texts: textUpserts,
          removeAddresses: Array.from(addressRemovals),
          removeTextKeys: Array.from(textRemovals),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!isCurrentSave()) return;
      if (!response.ok) {
        if (response.status === 503) {
          setSaveStatus("unable-to-verify");
          setMessage(data.error ?? "Unable to verify ownership right now.");
          return;
        }
        throw new Error(data.error ?? `Request failed with ${response.status}`);
      }
      const savedProfile = data as RecordProfile;
      setProfile(savedProfile);
      hydrateProfile(savedProfile);
      setSaveStatus("success");
    } catch (caught) {
      if (!isCurrentSave()) return;
      setSaveStatus("failure");
      setMessage(caught instanceof Error ? caught.message : "Save failed");
    }
  }

  const pending = saveStatus === "pending";
  const retrying = saveStatus === "unable-to-verify";

  return (
    <section className="panel" aria-labelledby="records-title">
      <h2 className="panel-title" id="records-title">Records</h2>
      <p className="mono muted">
        Saved to <span className="mono">{suiName}</span> on label.onsui.eth through Namespace.
        Ownership is rechecked on every save.
      </p>

      {loadStatus === "loading" ? <p className="mono muted">Loading your saved records...</p> : null}
      {loadStatus === "error" ? (
        <div className="error" role="alert">
          <p>{loadError}</p>
          <button type="button" className="btn-secondary" onClick={load}>Retry</button>
        </div>
      ) : null}

      <form className="field" onSubmit={save}>
        <fieldset className="field" disabled={loadStatus !== "ready" || pending}>
          <legend className="field-label">Addresses</legend>
          {!hasRecords && loadStatus === "ready" ? (
            <p className="mono muted">No records yet - add your first one below.</p>
          ) : null}
          {addresses.map((row) => {
            const rowError = addressRowError(row);
            return (
              <div key={row.id} className={row.leaving ? "record-row record-row-leaving" : "record-row"}>
                <div className="btn-row">
                  <select
                    className="input mono"
                    style={{ maxWidth: 160, flex: "0 0 auto" }}
                    value={row.chain}
                    onChange={(event) => updateAddressRow(row.id, { chain: event.target.value as ChainName })}
                    aria-label="Chain"
                  >
                    {ORDERED_CHAINS.map((chain) => <option key={chain} value={chain}>{CHAIN_LABELS[chain]}</option>)}
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
                  <button type="button" className="btn-secondary" onClick={() => removeAddressRow(row.id)}>Remove</button>
                </div>
                {rowError ? <p className="mono muted" role="alert" id={`address-error-${row.id}`}>{rowError}</p> : null}
              </div>
            );
          })}
          <button type="button" className="btn-secondary" onClick={addAddressRow}>+ Add address</button>
        </fieldset>

        <fieldset className="field" disabled={loadStatus !== "ready" || pending}>
          <legend className="field-label">Text records</legend>
          {texts.map((row) => {
            const rowError = textRowError(row);
            return (
              <div key={row.id} className={row.leaving ? "record-row record-row-leaving" : "record-row"}>
                <div className="btn-row">
                  <select
                    className="input mono"
                    style={{ maxWidth: 180 }}
                    value={row.customKey ? CUSTOM_KEY_VALUE : row.key}
                    onChange={(event) => {
                      const next = event.target.value;
                      updateTextRow(row.id, next === CUSTOM_KEY_VALUE
                        ? { customKey: true, key: "" }
                        : { customKey: false, key: next });
                    }}
                    aria-label="Text record type"
                  >
                    <option value="" disabled>Choose a record type...</option>
                    {TEXT_KEY_PRESETS.map((preset) => <option key={preset.key} value={preset.key}>{preset.label}</option>)}
                    <option value={CUSTOM_KEY_VALUE}>Custom key...</option>
                  </select>
                  {row.customKey ? (
                    <input
                      className="input mono"
                      style={{ maxWidth: 180 }}
                      value={row.key}
                      onChange={(event) => updateTextRow(row.id, { key: event.target.value })}
                      placeholder="e.g. com.example"
                      autoComplete="off"
                      spellCheck={false}
                      aria-label="Custom record key"
                      aria-invalid={rowError ? true : undefined}
                      aria-describedby={rowError ? `text-error-${row.id}` : undefined}
                    />
                  ) : null}
                  <input
                    className="input mono"
                    value={row.value}
                    onChange={(event) => updateTextRow(row.id, { value: event.target.value })}
                    placeholder="Value"
                    autoComplete="off"
                    aria-label={`Value for ${row.key || "text record"}`}
                  />
                  <button type="button" className="btn-secondary" onClick={() => removeTextRow(row.id)}>Remove</button>
                </div>
                {!row.customKey && row.key ? <p className="mono muted">{row.key}</p> : null}
                {rowError ? <p className="mono muted" role="alert" id={`text-error-${row.id}`}>{rowError}</p> : null}
              </div>
            );
          })}
          <button type="button" className="btn-secondary" onClick={addTextRow}>+ Add text record</button>
        </fieldset>

        <div className="btn-row">
          <button type="submit" className="btn" disabled={pending || hasRowErrors || loadStatus !== "ready"}>
            {pending ? "Saving..." : retrying ? "Retry" : "Save"}
          </button>
        </div>
      </form>

      <div aria-live="polite">
        {saveStatus === "success" && profile ? (
          <>
            <span className="chip chip-ok">saved</span>
            <p className="mono">{profile.fullName}</p>
            {Object.entries(profile.addresses).map(([chain, value]) => (
              <p className="mono muted" key={chain}>{CHAIN_LABELS[chain as ChainName] ?? chain}: {value}</p>
            ))}
            {Object.entries(profile.texts).map(([key, value]) => (
              <p className="mono muted" key={key}>{key}: {value}</p>
            ))}
          </>
        ) : null}
      </div>

      {retrying || saveStatus === "failure" ? <p className="error" role="alert">{message}</p> : null}
    </section>
  );
}
