import { ethers } from "hardhat";
import { namehash } from "viem";

async function main() {
  // ============================================================
  // UPDATE THIS after deploying the OffchainResolver contract
  // ============================================================
  const RESOLVER_ADDRESS = "0x47F3B5d858FeFE100016C75492a53a7296D1c335";

  const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"; // Same on mainnet & sepolia
  const DOMAIN = "pushx.eth";
  const node = namehash(DOMAIN);

  console.log(`Setting resolver for ${DOMAIN}...`);
  console.log(`  Node:     ${node}`);
  console.log(`  Resolver: ${RESOLVER_ADDRESS}`);

  const [signer] = await ethers.getSigners();
  console.log(`  Signer:   ${signer.address}`);

  const registry = new ethers.Contract(
    ENS_REGISTRY,
    ["function setResolver(bytes32 node, address resolver) external"],
    signer
  );

  const tx = await registry.setResolver(node, RESOLVER_ADDRESS);
  console.log(`  Tx hash:  ${tx.hash}`);
  await tx.wait();

  console.log(`\nDone! ${DOMAIN} now resolves via the OffchainResolver.`);
  console.log(`Try: npx tsx ../gateway/test-decode.ts evan --prod`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
