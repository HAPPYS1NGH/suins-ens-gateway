"use client";

import Link from "next/link";

import { labelOf, truncateAddr } from "@/lib/records";

import { PixelAvatar } from "./pixel-avatar";

export interface SuiName {
  name: string;
  nftId: string;
  avatar: string | null;
  imageUrl: string | null;
  targetAddress: string | null;
  expirationTimestampMs: number;
}

interface NameGridProps {
  names: SuiName[];
}

/**
 * A real link, so the profile is middle-clickable, copyable and crawlable — and the
 * browser supplies the keyboard and focus behaviour the old `role="button"` div had
 * to reimplement.
 */
function NameCard({ name }: { name: SuiName }) {
  return (
    <Link className="name-card" href={`/${labelOf(name.name)}`}>
      <div className="name-card__avatar">
        {name.imageUrl ? (
          <img src={name.imageUrl} alt="" width={64} height={64} />
        ) : (
          <PixelAvatar seed={name.name} size={64} face />
        )}
      </div>
      <div className="name-card__meta">
        <span className="name-card__name">{name.name}</span>
        {name.targetAddress ? (
          <span className="name-card__target mono muted" title={name.targetAddress}>
            {truncateAddr(name.targetAddress)}
          </span>
        ) : null}
        <span className="name-card__expiry mono muted">
          Expires {new Date(name.expirationTimestampMs).toLocaleDateString()}
        </span>
      </div>
      <span className="name-card__cta">Manage</span>
    </Link>
  );
}

export function NameGrid({ names }: NameGridProps) {
  if (names.length === 0) {
    return (
      <section className="panel" aria-labelledby="empty-title">
        <h2 className="panel-title" id="empty-title">Your Sui names</h2>
        <p className="mono muted">
          No .sui names found in this wallet.
        </p>
        <p className="mono">
          <a
            className="link"
            href="https://suins.io"
            target="_blank"
            rel="noopener noreferrer"
          >
            Mint your .sui name on SuiNS
          </a>
        </p>
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="names-title">
      <h2 className="panel-title" id="names-title">Your Sui name NFTs</h2>
      <p className="mono muted">Open a name to view or edit its public onsui.eth profile.</p>

      <div className="name-grid" role="list">
        {names.map((name) => (
          <NameCard key={name.nftId} name={name} />
        ))}
      </div>
    </section>
  );
}
