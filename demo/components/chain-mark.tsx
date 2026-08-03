import type { ChainName } from "@thenamespace/offchain-manager";

import { CHAIN_LABELS, CHAIN_MARKS } from "@/lib/records";

import { CHAIN_ICONS } from "./icons/chain";

/**
 * Pick black or white for a monogram tile. The brand palette runs from very dark
 * (Base #0052ff) to very light (Scroll #ebc28e), so one fixed text colour is
 * unreadable at one end. Rec. 601 luma is enough for a binary choice this small.
 */
function monogramColor(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const luma = (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
  return luma > 140 ? "#0b0713" : "#ffffff";
}

/** Brand mark for a chain, falling back to a monogram tile in its brand colour. */
export function ChainMark({ chain, size = 26 }: { chain: ChainName; size?: number }) {
  const Icon = CHAIN_ICONS[chain];
  if (Icon) {
    return <Icon className="chainmark" width={size} height={size} aria-hidden="true" />;
  }

  const meta = CHAIN_MARKS[chain];
  const color = meta?.color ?? "#4b3f63";
  const mark = meta?.mark ?? CHAIN_LABELS[chain].slice(0, 2).toUpperCase();

  return (
    <span
      className="chainmark chainmark--mono"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        background: color,
        color: monogramColor(color),
        fontSize: Math.round(size * (mark.length > 1 ? 0.38 : 0.5)),
      }}
    >
      {mark}
    </span>
  );
}
