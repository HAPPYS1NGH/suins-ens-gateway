import "server-only";

import { SuiGrpcClient } from "@mysten/sui/grpc";
import { suins } from "@mysten/suins";

import { env } from "@/lib/env";

/**
 * Every Sui read sits in front of a user-facing request, so an unreachable fullnode has
 * to become a verdict rather than a hung route.
 */
export const SUI_REQUEST_TIMEOUT_MS = 10_000;

let client: ReturnType<typeof create> | undefined;

function create() {
  return new SuiGrpcClient({
    network: env.SUI_NETWORK,
    baseUrl: env.SUI_RPC_URL ?? `https://fullnode.${env.SUI_NETWORK}.sui.io:443`,
    timeout: SUI_REQUEST_TIMEOUT_MS,
  }).$extend(suins());
}

/** Lazily constructed so importing this module never reads the environment. */
export function suiClient() {
  client ??= create();
  return client;
}
