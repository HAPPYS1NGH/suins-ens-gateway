"use client";

import { ChainName, validateAddress } from "@thenamespace/offchain-manager";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  CHAIN_LABELS,
  ORDERED_CHAINS,
  RESERVED_CHAINS,
  RESERVED_TEXT_KEYS,
  TEXT_KEY_PRESETS,
  chainNameFromAddressKey,
} from "@/lib/records";

export interface RecordProfile {
  fullName: string;
  addresses: Record<string, string>;
  texts: Record<string, string>;
  contenthash: string | null;
}

interface RecordEditorProps {
  /** The exact name this app just confirmed the session wallet owns. */
  suiName: string;
  /** SuiNS avatar, if set. Hides the local "add avatar" text-record preset. */
  suiAvatar?: string | null;
  /** Fires whenever the loaded or saved profile changes. */
  onProfileChange?: (profile: RecordProfile | null) => void;
  /** True while a save is in flight, so a host drawer can refuse to close mid-write. */
  onBusyChange?: (busy: boolean) => void;
  /** Fires only after a save the server accepted. */
  onSaved?: (profile: RecordProfile) => void;
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

const CUSTOM_KEY_VALUE = "__custom__";
const LEAVE_ANIMATION_MS = 150;

/**
 * A record is keyed by its chain (or text key), so two rows sharing one would race to
 * define it and the merge would silently keep whichever landed last. Both validators
 * take the sibling rows and reject the duplicate up front, which covers every way one
 * can appear: adding a second row, retyping a custom key, or switching an existing
 * row onto a key another row already holds.
 */
function isDuplicate<T extends { id: number; leaving: boolean }>(
  row: T,
  rows: T[],
  keyOf: (row: T) => string,
): boolean {
  const key = keyOf(row);
  // Only the later row is flagged. Marking both would blame the record the holder
  // already had for a collision the new one caused.
  return rows.some(
    (other) =>
      other.id !== row.id &&
      !other.leaving &&
      other.id < row.id &&
      keyOf(other) === key,
  );
}

function addressRowError(row: AddressRow, rows: AddressRow[] = []): string | null {
  if (isDuplicate(row, rows, (candidate) => candidate.chain)) {
    return `${CHAIN_LABELS[row.chain]} already has an address`;
  }
  if (!row.value.trim()) return null;
  try {
    validateAddress(row.value.trim(), row.chain);
    return null;
  } catch {
    return `Not a valid ${row.chain} address`;
  }
}

function textRowError(row: TextRow, rows: TextRow[] = []): string | null {
  const key = row.key.trim();
  if (!key) return null;
  if (RESERVED_TEXT_KEYS.has(key)) {
    return "This key is reserved for Sui-native data";
  }
  if (isDuplicate(row, rows, (candidate) => candidate.key.trim())) {
    return `${key} is already set`;
  }
  return null;
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
export function RecordEditor({
  suiName,
  suiAvatar,
  onProfileChange,
  onBusyChange,
  onSaved,
}: RecordEditorProps) {
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  const [texts, setTexts] = useState<TextRow[]>([]);
  const [removedChains, setRemovedChains] = useState<Set<string>>(new Set());
  const [removedTextKeys, setRemovedTextKeys] = useState<Set<string>>(new Set());
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<RecordProfile | null>(null);

  const presets = useMemo(
    () =>
      suiAvatar
        ? TEXT_KEY_PRESETS.filter((preset) => preset.key !== "avatar")
        : TEXT_KEY_PRESETS,
    [suiAvatar],
  );

  const isPresetKey = useCallback(
    (key: string): boolean => presets.some((preset) => preset.key === key),
    [presets],
  );
  const loadSequence = useRef(0);
  const saveSequence = useRef(0);
  const currentSuiName = useRef(suiName);
  currentSuiName.current = suiName;

  const hydrateProfile = useCallback((nextProfile: RecordProfile | null) => {
    setAddresses(
      Object.entries(nextProfile?.addresses ?? {})
        .map(([key, value]) => ({ chain: chainNameFromAddressKey(key), value }))
        // Unknown coin types, and any chain the gateway serves from SuiNS instead,
        // are not editable here — a legacy 784 record must not resurface as a row.
        .filter((row): row is { chain: ChainName; value: string } =>
          Boolean(row.chain) && !RESERVED_CHAINS.has(row.chain!),
        )
        .map(({ chain, value }) => ({
          id: nextRowId(),
          chain,
          value,
          origin: "existing" as const,
          originalChain: chain,
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
  }, [isPresetKey]);

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
      setProfile(existing);
      onProfileChange?.(existing);
      hydrateProfile(existing);
      setLoadStatus("ready");
    } catch (caught) {
      if (sequence !== loadSequence.current) return;
      setLoadStatus("error");
      setLoadError(caught instanceof Error ? caught.message : "Could not load existing records");
    }
  }, [hydrateProfile, onProfileChange, suiName]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    saveSequence.current += 1;
    setSaveStatus("idle");
    setMessage(null);
    setProfile(null);
    onProfileChange?.(null);
  }, [suiName, onProfileChange]);

  function addAddressRow() {
    setAddresses((rows) => {
      const taken = new Set(rows.filter((row) => !row.leaving).map((row) => row.chain));
      const chain = ORDERED_CHAINS.find((candidate) => !taken.has(candidate));
      if (!chain) return rows;
      return [
        ...rows,
        { id: nextRowId(), chain, value: "", origin: "new", originalChain: null, leaving: false },
      ];
    });
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
    addresses.some((row) => !row.leaving && addressRowError(row, addresses)) ||
    texts.some((row) => !row.leaving && textRowError(row, texts));
  const hasRecords = addresses.some((row) => !row.leaving) || texts.some((row) => !row.leaving);
  const usedChains = new Set(addresses.filter((row) => !row.leaving).map((row) => row.chain));
  const usedTextKeys = new Set(
    texts.filter((row) => !row.leaving).map((row) => row.key.trim()),
  );
  const allChainsUsed = usedChains.size >= ORDERED_CHAINS.length;

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
      onProfileChange?.(savedProfile);
      hydrateProfile(savedProfile);
      setSaveStatus("success");
      onSaved?.(savedProfile);
    } catch (caught) {
      if (!isCurrentSave()) return;
      setSaveStatus("failure");
      setMessage(caught instanceof Error ? caught.message : "Save failed");
    }
  }

  const pending = saveStatus === "pending";
  const retrying = saveStatus === "unable-to-verify";

  useEffect(() => {
    onBusyChange?.(pending);
  }, [pending, onBusyChange]);

  return (
    <section className="panel" aria-labelledby="records-title">
      <h2 className="sr-only" id="records-title">Records</h2>

      {loadStatus === "loading" ? <p className="mono muted">Loading records…</p> : null}
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
            <p className="mono muted">No records yet.</p>
          ) : null}
          {addresses.map((row) => {
            const rowError = addressRowError(row, addresses);
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
                    {ORDERED_CHAINS.map((chain) => (
                      <option
                        key={chain}
                        value={chain}
                        disabled={chain !== row.chain && usedChains.has(chain)}
                      >
                        {CHAIN_LABELS[chain]}
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
                  <button type="button" className="btn-secondary" onClick={() => removeAddressRow(row.id)}>Remove</button>
                </div>
                {rowError ? <p className="mono muted" role="alert" id={`address-error-${row.id}`}>{rowError}</p> : null}
              </div>
            );
          })}
          <button
            type="button"
            className="btn-secondary"
            onClick={addAddressRow}
            disabled={allChainsUsed}
          >
            + Add address
          </button>
        </fieldset>

        <fieldset className="field" disabled={loadStatus !== "ready" || pending}>
          <legend className="field-label">Text records</legend>
          {texts.map((row) => {
            const rowError = textRowError(row, texts);
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
                    {presets.map((preset) => (
                      <option
                        key={preset.key}
                        value={preset.key}
                        disabled={preset.key !== row.key && usedTextKeys.has(preset.key)}
                      >
                        {preset.label}
                      </option>
                    ))}
                    <option value={CUSTOM_KEY_VALUE}>Custom key...</option>
                  </select>
                  {row.customKey ? (
                    <input
                      className="input mono"
                      style={{ maxWidth: 180 }}
                      value={row.key}
                      onChange={(event) => updateTextRow(row.id, { key: event.target.value })}
                      placeholder="Custom key"
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
        {saveStatus === "success" ? <span className="chip chip-ok">saved</span> : null}
      </div>

      {retrying || saveStatus === "failure" ? <p className="error" role="alert">{message}</p> : null}
    </section>
  );
}
