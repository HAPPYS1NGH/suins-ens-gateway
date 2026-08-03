import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

// SUI coinType from SLIP-0044: https://github.com/nichanank/slip-0044
const SUI_COIN_TYPE = 784;

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

async function fetchSuiAddress(ensName: string) {
  console.log(`Resolving SUI address for: ${ensName}`);
  console.log(`Using coinType: ${SUI_COIN_TYPE} (SUI - SLIP-0044)\n`);

  const suiAddress = await publicClient.getEnsAddress({
    name: normalize(ensName),
    coinType: SUI_COIN_TYPE,
  });

  if (suiAddress) {
    console.log(`ENS Name   : ${ensName}`);
    console.log(`SUI Address: ${suiAddress}`);
  } else {
    console.log(`No SUI address found for ${ensName}`);
  }

  return suiAddress;
}

fetchSuiAddress("happysingh.onsui.eth");
