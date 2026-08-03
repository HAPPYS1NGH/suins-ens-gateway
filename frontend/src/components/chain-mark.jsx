import { CHAIN_LABELS, CHAIN_MARKS } from "../records.js";

import { CHAIN_ICONS } from "./icons/chain";

/** Pick black or white for a monogram tile. Rec. 601 luma is enough for a binary choice. */
function monogramColor(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  const luma = (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
  return luma > 140 ? "#0b0713" : "#ffffff";
}

/** Brand mark for a chain, falling back to a monogram tile in its brand colour. */
export function ChainMark({ chain, size = 26 }) {
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