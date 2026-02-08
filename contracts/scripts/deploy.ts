import { ethers } from "hardhat";

async function main() {
  // Gateway URL — the deployed Cloudflare Worker
  const GATEWAY_URL = "https://suins-ens-gateway.happys1ngh.workers.dev/lookup/{sender}/{data}.json";

  // Signer address — matches the PRIVATE_KEY in the CF Worker
  const SIGNER_ADDRESS = "0xb29CC6c4fAb0981ee959110C7055FA365fEe2095";

  console.log("Deploying OffchainResolver...");
  console.log(`  Gateway URL: ${GATEWAY_URL}`);
  console.log(`  Signer:      ${SIGNER_ADDRESS}`);

  const OffchainResolver = await ethers.getContractFactory("OffchainResolver");
  const resolver = await OffchainResolver.deploy(GATEWAY_URL, [SIGNER_ADDRESS]);

  await resolver.waitForDeployment();
  const address = await resolver.getAddress();

  console.log(`\nOffchainResolver deployed to: ${address}`);
  console.log(`\nNext step: Set this as the resolver for pushx.eth`);
  console.log(`  Update RESOLVER_ADDRESS in scripts/set-resolver.ts`);
  console.log(`  Then run: npm run set-resolver`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
