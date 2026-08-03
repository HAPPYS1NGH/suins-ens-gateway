import { truncateAddr } from "../records.js";

import { CopyButton } from "./copy-button.jsx";

export function SuinsRecords({ targetAddress, avatar, contentHash, walrusSiteId }) {
  // avatar/targetAddress/contentHash render in the profile card; Walrus has no card
  // surface of its own, so it stays in this read-only section.
  const rows = [
    { label: "Walrus site", key: 'text("walrusSiteId")', value: walrusSiteId },
  ].filter((row) => Boolean(row.value));

  if (rows.length === 0) return null;

  return (
    <section className="psection" aria-labelledby="suins-title">
      <h2 className="psection__title" id="suins-title">
        From SuiNS
        <span className="psection__note muted">Served straight from Sui — not editable here</span>
      </h2>

      <div className="precords">
        {rows.map((row, index) => (
          <div className="paddr" key={row.key} style={{ "--prec-i": index }}>
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