import { ChainName } from "@thenamespace/offchain-manager";
import type { SVGProps } from "react";

import { ChainArbitrumIcon } from "./arbitrum";
import { ChainAvalancheIcon } from "./avalanche";
import { ChainBaseIcon } from "./base";
import { ChainBitcoinIcon } from "./bitcoin";
import { ChainBnbIcon } from "./bnb";
import { ChainEthereumIcon } from "./ethereum";
import { ChainEvmIcon } from "./evm";
import { ChainLineaIcon } from "./linea";
import { ChainOptimismIcon } from "./optimism";
import { ChainPolygonIcon } from "./polygon";
import { ChainScrollIcon } from "./scroll";
import { ChainSolanaIcon } from "./solana";
import { ChainSuiIcon } from "./sui";
import { ChainZksyncIcon } from "./zksync";

export type ChainIconComponent = (props: SVGProps<SVGSVGElement>) => React.JSX.Element;

/** Official brand marks. Chains absent here fall back to a monogram tile. */
export const CHAIN_ICONS: Partial<Record<ChainName, ChainIconComponent>> = {
  [ChainName.Default]: ChainEvmIcon,
  [ChainName.Ethereum]: ChainEthereumIcon,
  [ChainName.Base]: ChainBaseIcon,
  [ChainName.Arbitrum]: ChainArbitrumIcon,
  [ChainName.Optimism]: ChainOptimismIcon,
  [ChainName.Polygon]: ChainPolygonIcon,
  [ChainName.Bsc]: ChainBnbIcon,
  [ChainName.Avalanche]: ChainAvalancheIcon,
  [ChainName.Linea]: ChainLineaIcon,
  [ChainName.Scroll]: ChainScrollIcon,
  [ChainName.Zksync]: ChainZksyncIcon,
  [ChainName.Solana]: ChainSolanaIcon,
  [ChainName.Bitcoin]: ChainBitcoinIcon,
  [ChainName.Sui]: ChainSuiIcon,
};
