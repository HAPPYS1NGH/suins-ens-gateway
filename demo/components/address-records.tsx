"use client";

import { ChainName } from "@thenamespace/offchain-manager";

import {
  CHAIN_LABELS,
  DISPLAY_CHAINS,
  RESERVED_CHAINS,
  chainNameFromAddressKey,
  truncateAddr,
} from "@/lib/records";

import { ChainMark } from "./chain-mark";
import { CopyButton } from "./copy-button";

interface AddressRecordsProps {
  /** Raw Namespace addresses, keyed by SLIP-44 coin type. */
  addresses: Record<string, string>;
  /**
   * SuiNS target address (coin type 784), read from Sui. Read-only — never written
   * from here — but shown as the table's first row so the name's native chain has a
   * home alongside the ENS-sourced ones.
   */
  suiAddress?: string | null;
}

/**
 * Set chains first in `DISPLAY_CHAINS` order, then the rest as empty rows so adding
 * one is still discoverable. Unknown coin types and SuiNS-served chains are dropped
 * from the Namespace half, matching the server merge — the Sui row is sourced
 * separately from `suiAddress` so a stale 784 record can never displace it.
 */
export function AddressRecords({ addresses, suiAddress }: AddressRecordsProps) {
  const byChain = new Map<ChainName, string>();
  for (const [key, value] of Object.entries(addresses)) {
    const chain = chainNameFromAddressKey(key);
    // Reserved chains are served from SuiNS, so a Namespace value for one is never
    // what resolves — the Sui row below shows the real source instead.
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
      <h2 className="psection__title" id="addresses-title">
        Addresses
      </h2>

      <div className="precords">
        <AddressRow
          key={ChainName.Sui}
          chain={ChainName.Sui}
          value={suiAddress?.trim() || undefined}
          index={0}
        />
        {[...set, ...unset].map((chain, index) => (
          <AddressRow key={chain} chain={chain} value={byChain.get(chain)} index={index + 1} />
        ))}
      </div>
    </section>
  );
}

function AddressRow({
  chain,
  value,
  index,
}: {
  chain: ChainName;
  value: string | undefined;
  index: number;
}) {
  return (
    <div
      className={value ? "paddr" : "paddr paddr--empty"}
      style={{ "--prec-i": index } as React.CSSProperties}
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
