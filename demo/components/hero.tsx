"use client";

import { PixelAvatar } from "./pixel-avatar";

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
          <button
            type="button"
            className="btn claim__cta"
            onClick={() =>
              document.getElementById("wallet-connect-trigger")?.click()
            }
          >
            Connect Sui wallet
          </button>
        </div>

        <aside className="claim__aside">
          <span className="claim-preview__cap">Preview</span>
          <div className="claim-preview">
            <span className="claim-preview__avatar">
              <PixelAvatar seed="yourname.sui" size={56} face />
            </span>
            <div className="claim-preview__meta">
              <span className="claim-preview__name">yourname.sui</span>
              <span className="claim-preview__addrlabel">
                Default receiving address · all EVM chains
              </span>
              <span className="claim-preview__wallet">0x0000…0000</span>
            </div>
          </div>
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
    </section>
  );
}