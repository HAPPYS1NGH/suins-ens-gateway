"use client";

import { CopyButton } from "./copy-button";
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
  onSelect: (name: SuiName) => void;
  disabled?: boolean;
}

function truncateAddr(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function NameCard({
  name,
  onSelect,
  disabled,
}: {
  name: SuiName;
  onSelect: (name: SuiName) => void;
  disabled?: boolean;
}) {
  function handleClick() {
    if (!disabled) onSelect(name);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!disabled) onSelect(name);
    }
  }

  return (
    <div
      className="name-card"
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-disabled={disabled}
    >
      <div className="name-card__avatar">
        {name.imageUrl ? (
          <img
            src={name.imageUrl}
            alt={name.name}
            width={64}
            height={64}
          />
        ) : (
          <PixelAvatar seed={name.name} size={64} face />
        )}
      </div>
      <div className="name-card__meta">
        <span className="name-card__name">{name.name}</span>
        {name.targetAddress ? (
          <span className="name-card__target mono muted" title={name.targetAddress}>
            {truncateAddr(name.targetAddress)}
            <CopyButton value={name.targetAddress} label={`${name.name} target address`} />
          </span>
        ) : null}
        <span className="name-card__expiry mono muted">
          Expires {new Date(name.expirationTimestampMs).toLocaleDateString()}
        </span>
      </div>
      <span className="name-card__cta">Manage</span>
    </div>
  );
}

export function NameGrid({ names, onSelect, disabled }: NameGridProps) {
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
      <p className="mono muted">Pick a name to create or manage its offchain onsui.eth subname.</p>

      <div className="name-grid" role="list">
        {names.map((name) => (
          <NameCard key={name.nftId} name={name} onSelect={onSelect} disabled={disabled} />
        ))}
      </div>
    </section>
  );
}
