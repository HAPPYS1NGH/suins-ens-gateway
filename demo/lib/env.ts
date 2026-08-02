import "server-only";

import { z } from "zod";

const envSchema = z.object({
  UPSTASH_REDIS_REST_URL: z.url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  APP_ORIGIN: z.url(),
  SUI_NETWORK: z.enum(["mainnet", "testnet", "devnet", "localnet"]),
  /** Overrides the public fullnode gRPC endpoint derived from SUI_NETWORK. */
  SUI_RPC_URL: z.url().optional(),
  NAMESPACE_API_KEY: z.string().min(1),
  /** Mainnet Ethereum RPC for CCIP-Read ENS preview; viem's public default is rate-limited. */
  MAINNET_RPC_URL: z.url().optional(),
});

export type Env = z.infer<typeof envSchema>;

let parsed: Env | undefined;

function load(): Env {
  if (!parsed) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      throw new Error(
        `Invalid environment: ${result.error.issues
          .map((issue) => `${issue.path.join(".")} ${issue.message}`)
          .join("; ")}`,
      );
    }
    parsed = result.data;
  }
  return parsed;
}

/**
 * Validated server environment.
 *
 * ponytail: resolved on first property access rather than at module load, because
 * `next build` imports every server module and would otherwise demand real secrets
 * just to compile. Access still throws loudly with the full list of bad values.
 */
export const env: Env = new Proxy({} as Env, {
  get: (_target, key: string) => load()[key as keyof Env],
});
