import "server-only";

import { createOffchainClient, type OffchainClient } from "@thenamespace/offchain-manager";

import { env } from "@/lib/env";

let client: OffchainClient | undefined;

/**
 * Lazily constructed so importing this module never reads the environment. This is
 * the only place `NAMESPACE_API_KEY` is read; the mutation credential never leaves
 * server-only code.
 */
export function namespaceClient(): OffchainClient {
  client ??= createOffchainClient({
    mode: "mainnet",
    defaultApiKey: env.NAMESPACE_API_KEY,
  });
  return client;
}
