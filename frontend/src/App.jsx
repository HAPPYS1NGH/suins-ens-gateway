import { useCallback, useEffect, useRef, useState } from "react";

import { AddressRecords } from "./components/address-records.jsx";
import { ProfileCard } from "./components/profile-card.jsx";
import { SuinsRecords } from "./components/suins-records.jsx";
import { resolveProfile } from "./resolve.js";

/**
 * Read-only profile viewer. Enter a SuiNS name → resolve `{label}.onsui.eth` via
 * the ENS CCIP-Read gateway (SuiNS + Namespace, no wallet, no writes). The profile
 * components are the demo's, fed straight from the resolved records.
 */
export function App() {
  const [input, setInput] = useState("happysingh");
  const [data, setData] = useState(null); // { name, suins, profile } | null
  const [status, setStatus] = useState("idle"); // idle | loading | error | notfound
  const [error, setError] = useState("");
  const resolvedLabel = useRef("");

  const run = useCallback(async (rawInput) => {
    const label = rawInput.trim().toLowerCase().replace(/^@/, "").replace(/\.sui$/, "");
    if (!label) {
      setStatus("error");
      setError("Enter a name to resolve");
      return;
    }
    resolvedLabel.current = label;
    setStatus("loading");
    setError("");
    try {
      const result = await resolveProfile(rawInput);
      if (result.notFound) {
        setData(null);
        setStatus("notfound");
      } else {
        setData(result);
        setStatus("idle");
      }
    } catch (caught) {
      setData(null);
      setError(caught?.shortMessage || caught?.message || "Failed to resolve");
      setStatus("error");
    }
  }, []);

  // Preview happysingh on first load so the page isn't empty.
  useEffect(() => {
    run("happysingh");
  }, [run]);

  const onSubmit = (event) => {
    event.preventDefault();
    run(input);
  };

  const { name, suins, profile } = data ?? {};
  const texts = profile?.texts ?? {};
  const addresses = profile?.addresses ?? {};

  return (
    <>
      <div className="glow app-atmosphere" aria-hidden="true" />
      <div className="app">
        <header className="app-header">
          <div className="app-header__inner">
            <a className="logo" href="/">
              on<span className="logo-accent">sui</span>.eth
            </a>
          </div>
        </header>

        <main className="main">
          <form className="lookup" onSubmit={onSubmit} role="search">
            <div className="lookup__field">
              <span className="lookup__at" aria-hidden="true">@</span>
              <input
                className="lookup__input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="happysingh"
                autoComplete="off"
                spellCheck="false"
                aria-label="SuiNS name"
              />
              <span className="lookup__suffix">.sui</span>
            </div>
            <button type="submit" className="btn lookup__btn" disabled={status === "loading"}>
              {status === "loading" ? "Resolving…" : "View profile"}
            </button>
          </form>

          {status === "loading" ? (
            <section className="panel" aria-live="polite">
              <p className="mono muted">Resolving {resolvedLabel.current}.sui…</p>
            </section>
          ) : null}

          {status === "error" ? (
            <section className="panel" aria-live="polite">
              <p className="error">{error}</p>
            </section>
          ) : null}

          {status === "notfound" ? (
            <section className="panel" aria-live="polite">
              <h1 className="panel-title">No profile found</h1>
              <p className="mono muted">
                {resolvedLabel.current}.sui has no ENS records on onsui.eth yet.
              </p>
            </section>
          ) : null}

          {status === "idle" && data ? (
            <>
              <ProfileCard
                name={name}
                avatar={suins.avatar}
                contentHash={suins.contentHash}
                texts={texts}
              />
              <AddressRecords addresses={addresses} suiAddress={suins.targetAddress} />
              <SuinsRecords {...suins} />
            </>
          ) : null}
        </main>

        <footer className="footer">
          <span className="mono muted">SuiNS → ENS gateway demo · read-only</span>
        </footer>
      </div>
    </>
  );
}