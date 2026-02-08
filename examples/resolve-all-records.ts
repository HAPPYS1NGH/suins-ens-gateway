import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

const SUI_COIN_TYPE = 784;

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

async function resolveAllRecords(ensName: string) {
  const normalized = normalize(ensName);
  console.log(`\nResolving all records for: ${ensName}\n`);

  // 1. SUI address (coinType 784)
  const suiAddress = await publicClient.getEnsAddress({
    name: normalized,
    coinType: SUI_COIN_TYPE,
  });
  console.log(`SUI Address (784): ${suiAddress || "(not set)"}`);

  // 2. Avatar
  const avatar = await publicClient.getEnsText({
    name: normalized,
    key: "avatar",
  });
  console.log(`Avatar:            ${avatar || "(not set)"}`);

  // 3. Content hash (IPFS)
  const contenthash = await publicClient.getEnsText({
    name: normalized,
    key: "contentHash",
  });
  console.log(`Content Hash:      ${contenthash || "(not set)"}`);

  // 4. Original SUI name
  const suiName = await publicClient.getEnsText({
    name: normalized,
    key: "org.suins.name",
  });
  console.log(`SUI Name:          ${suiName || "(not set)"}`);

  // 5. Walrus Site ID
  const walrusSiteId = await publicClient.getEnsText({
    name: normalized,
    key: "walrusSiteId",
  });
  console.log(`Walrus Site ID:    ${walrusSiteId || "(not set)"}`);

  console.log();
}

resolveAllRecords("happysingh.onsui.eth");
