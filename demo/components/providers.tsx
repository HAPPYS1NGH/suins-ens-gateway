"use client";

import { createDAppKit, DAppKitProvider } from "@mysten/dapp-kit-react";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { useState, type PropsWithChildren } from "react";

/**
 * Wallet discovery reaches for `window`, so this module is only ever loaded through a
 * `next/dynamic` import with `ssr: false`.
 */
function createKit() {
  return createDAppKit({
    networks: ["mainnet"],
    defaultNetwork: "mainnet",
    createClient: (network) =>
      new SuiGrpcClient({
        network,
        baseUrl: `https://fullnode.${network}.sui.io`,
      }),
  });
}

export function Providers({ children }: PropsWithChildren) {
  const [dAppKit] = useState(createKit);
  return <DAppKitProvider dAppKit={dAppKit}>{children}</DAppKitProvider>;
}
