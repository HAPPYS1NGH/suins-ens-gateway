import {
  CHAIN_LABELS,
  DISPLAY_CHAINS,
  RESERVED_CHAINS,
  chainNameFromAddressKey,
  truncateAddr,
} from "../records.js";

import { ChainMark } from "./chain-mark.jsx";
import { CopyButton } from "./copy-button.jsx";

export function AddressRecords({ addresses, suiAddress }) {
  const byChain = new Map();
  for (const [key, value] of Object.entries(addresses)) {
    const chain = chainNameFromAddressKey(key);
    if (chain && !RESERVED_CHAINS.has(chain) && value.trim()) byChain.set(chain, value.trim());
  }

  const set = [
    ...DISPLAY_CHAINS.filter((chain) => byChain.has(chain)),
    ...[...byChain.keys()]
      .filter((chain) => !DISPLAY_CHAINS.includes(chain))
      .sort((a, b) => CHAIN_LABELS[a].localeCompare(CHAIN_LABELS[b])),
  ];
  const unset = DISPLAY_CHAINS.filter((chain) => !byChain.has(chain));

  return (
    <section className="psection" aria-labelledby="addresses-title">
      <h2 className="psection__title" id="addresses-title">Addresses</h2>

      <div className="precords">
        <AddressRow chain="Sui" value={suiAddress?.trim() || undefined} index={0} />
        {[...set, ...unset].map((chain, index) => (
          <AddressRow key={chain} chain={chain} value={byChain.get(chain)} index={index + 1} />
        ))}
      </div>
    </section>
  );
}

function AddressRow({ chain, value, index }) {
  return (
    <div
      className={value ? "paddr" : "paddr paddr--empty"}
      style={{ "--prec-i": index }}
    >
      <ChainMark chain={chain} />
      <span className="paddr__chain">{CHAIN_LABELS[chain]}</span>
      {value ? (
        <>
          <span className="paddr__value mono" title={value}>
            {truncateAddr(value)}
          </span>
          <CopyButton value={value} label={`${CHAIN_LABELS[chain]} address`} />
        </>
      ) : (
        <span className="paddr__value paddr__value--empty">Not set</span>
      )}
    </div>
  );
}