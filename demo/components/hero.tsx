"use client";

import {
  type UiWallet,
  useDAppKit,
  useWalletConnection,
  useWallets,
} from "@mysten/dapp-kit-react";
import Link from "next/link";
import { useState } from "react";

import { FlowExplainer } from "./flow-explainer";
import { PixelAvatar } from "./pixel-avatar";
import { useSignIn } from "./use-sign-in";
import { useWalletCtaLabel } from "./use-wallet-cta";

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
    </svg>
  );
}

const PERKS = [
  "Gasless offchain subname on onsui.eth — no L1 fees.",
  "Manage multichain addresses and text records.",
  "Ownership rechecked on every save.",
];

export function Hero() {
  // The Hero only renders when there's no session (see app/page.tsx), so the only
  // wallet states it cares about are "disconnected" and "connected, not yet signed".
  const dAppKit = useDAppKit();
  const wallets = useWallets();
  const { isConnected } = useWalletConnection();
  const signIn = useSignIn();
  const ctaLabel = useWalletCtaLabel(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  // One click from the landing page: connect the picked wallet, then sign the
  // challenge with the account `connectWallet` returns — no trip through the nav.
  const connectAndSignIn = (wallet: UiWallet) =>
    run(async () => {
      const { accounts } = await dAppKit.connectWallet({ wallet });
      if (!accounts[0]) throw new Error("No account available in this wallet");
      await signIn(accounts[0]);
    });

  const signInNow = () => run(async () => signIn());

  return (
    <section className="claim">
      <div className="claim__head">
        <span className="claim__eyebrow">
          <SparkleIcon />
          Sui → ENS
        </span>
        <h1 className="claim__title">
          Sui name holders,
          <span className="title-highlight"> sign in.</span>
        </h1>
        <p className="claim__lede">
          Connect a Sui wallet, pick one of your .sui names, and manage its ENS
          records through a gasless offchain subname on onsui.eth.
        </p>
      </div>

      <div className="claim__grid">
        <div className="claim__panel">
          <span className="claim__label">Get started</span>
          <p className="claim__blurb">
            Sign in with your Sui wallet to prove you own a .sui name, then
            edit its ENS records below.
          </p>

          {isConnected ? (
            <button
              type="button"
              className="btn claim__cta"
              onClick={() => void signInNow()}
              disabled={busy}
            >
              {busy ? "Signing…" : ctaLabel}
            </button>
          ) : wallets.length === 0 ? (
            <span className="claim__muted">No Sui wallets detected</span>
          ) : (
            <div className="claim__wallets">
              {wallets.map((wallet) => (
                <button
                  key={wallet.name}
                  type="button"
                  className="btn claim__cta"
                  onClick={() => void connectAndSignIn(wallet)}
                  disabled={busy}
                >
                  {wallet.name}
                </button>
              ))}
            </div>
          )}

          {error ? (
            <span className="claim__error" role="alert">
              {error}
            </span>
          ) : null}
        </div>

        <aside className="claim__aside">
          <span className="claim-preview__cap">Live example</span>
          <Link href="/happysingh" className="claim-preview" aria-label="View the live happysingh.sui profile">
            <span className="claim-preview__avatar">
              <PixelAvatar seed="happysingh.sui" size={56} face />
            </span>
            <div className="claim-preview__meta">
              <span className="claim-preview__name">happysingh.sui</span>
              <span className="claim-preview__addrlabel">
                Resolves at happysingh.onsui.eth
              </span>
              <span className="claim-preview__wallet">View live profile →</span>
            </div>
          </Link>
          <ul className="claim-perks">
            {PERKS.map((perk) => (
              <li key={perk}>
                <CheckIcon />
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <div className="claim__flow">
        <span className="claim__label">How a name resolves</span>
        <FlowExplainer />
      </div>
    </section>
  );
}