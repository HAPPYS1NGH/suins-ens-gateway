"use client";

import { truncateAddr } from "@/lib/records";

import { CopyButton } from "./copy-button";

export interface SuinsRecordsProps {
  /** SuiNS-served values, read from Sui. Every one of these is read-only here. */
  targetAddress: string | null;
  avatar: string | null;
  contentHash: string | null;
  walrusSiteId: string | null;
}

/**
 * The half of the profile the gateway resolves from SuiNS regardless of what
 * Namespace holds (`gateway/src/ccip-read/precedence.ts`). Shown, never edited: a
 * value written through this app would be ignored at resolution, so the editor does
 * not offer these keys at all.
 *
 * Renders nothing when the name has none of them set, which is the common case.
 */
export function SuinsRecords({ walrusSiteId }: SuinsRecordsProps) {
  // `avatar`, `targetAddress`, and `contentHash` are rendered in the profile card
  // (avatar overlay, the Sui address pill, the "Site" pill respectively), so they
  // are deliberately not repeated here as rows. Walrus has no card surface of its
  // own, so it stays in this read-only section.
  const rows = [
    { label: "Walrus site", key: 'text("walrusSiteId")', value: walrusSiteId },
  ].filter((row): row is { label: string; key: string; value: string } =>
    Boolean(row.value),
  );

  if (rows.length === 0) return null;

  return (
    <section className="psection" aria-labelledby="suins-title">
      <h2 className="psection__title" id="suins-title">
        From SuiNS
        <span className="psection__note muted">
          Served straight from Sui — not editable here
        </span>
      </h2>

      <div className="precords">
        {rows.map((row, index) => (
          <div
            className="paddr"
            key={row.key}
            style={{ "--prec-i": index } as React.CSSProperties}
          >
            <span className="paddr__chain">{row.label}</span>
            <span className="paddr__value mono" title={`${row.key}: ${row.value}`}>
              {truncateAddr(row.value)}
            </span>
            <CopyButton value={row.value} label={row.label} />
          </div>
        ))}
      </div>
    </section>
  );
}
