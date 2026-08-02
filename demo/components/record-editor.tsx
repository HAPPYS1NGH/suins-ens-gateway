"use client";

import { useState } from "react";

interface RecordProfile {
  fullName: string;
  ethereumAddress: string | null;
}

interface RecordEditorProps {
  /** The exact name this app just confirmed the session wallet owns. */
  suiName: string;
}

type Status = "idle" | "pending" | "success" | "failure" | "unable-to-verify";

/**
 * "unable to verify ownership" is kept visually and semantically distinct from a
 * hard failure: the wallet session is still valid, Sui just did not answer in time,
 * and retrying is the correct next action rather than treating this as rejected.
 */
export function RecordEditor({ suiName }: RecordEditorProps) {
  const [ethereumAddress, setEthereumAddress] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<RecordProfile | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setStatus("pending");
    setMessage(null);

    try {
      const response = await fetch("/api/records", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          suiName,
          ethereumAddress: ethereumAddress.trim() || undefined,
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
        Ethereum address
      </h2>
      <p className="mono muted">
        Saved to <span className="mono">{suiName}</span> on label.onsui.eth
        through Namespace. Ownership is rechecked on every save.
      </p>

      <form className="field" onSubmit={save}>
        <label className="field-label" htmlFor="record-eth-address">
          Ethereum address
        </label>
        <input
          id="record-eth-address"
          className="input mono"
          value={ethereumAddress}
          onChange={(event) => setEthereumAddress(event.target.value)}
          placeholder="0x…"
          autoComplete="off"
          spellCheck={false}
        />

        <div className="btn-row">
          <button type="submit" className="btn" disabled={pending}>
            {pending ? "Saving…" : retrying ? "Retry" : "Save"}
          </button>
        </div>
      </form>

      <div aria-live="polite">
        {status === "success" && profile ? (
          <>
            <span className="chip chip-ok">saved</span>
            <p className="mono">{profile.fullName}</p>
            <p className="mono muted">
              {profile.ethereumAddress ?? "No Ethereum address set."}
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
