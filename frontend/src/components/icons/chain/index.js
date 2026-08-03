import { ChainName } from "../../../records.js";

import { ChainArbitrumIcon } from "./arbitrum.jsx";
import { ChainBaseIcon } from "./base.jsx";
import { ChainBitcoinIcon } from "./bitcoin.jsx";
import { ChainEthereumIcon } from "./ethereum.jsx";
import { ChainOptimismIcon } from "./optimism.jsx";
import { ChainPolygonIcon } from "./polygon.jsx";
import { ChainSolanaIcon } from "./solana.jsx";
import { ChainSuiIcon } from "./sui.jsx";

/** Official brand marks. Chains absent here fall back to a monogram tile. */
export const CHAIN_ICONS = {
  [ChainName.Ethereum]: ChainEthereumIcon,
  [ChainName.Base]: ChainBaseIcon,
  [ChainName.Arbitrum]: ChainArbitrumIcon,
  [ChainName.Optimism]: ChainOptimismIcon,
  [ChainName.Polygon]: ChainPolygonIcon,
  [ChainName.Solana]: ChainSolanaIcon,
  [ChainName.Bitcoin]: ChainBitcoinIcon,
  [ChainName.Sui]: ChainSuiIcon,
};