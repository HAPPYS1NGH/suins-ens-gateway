import "server-only";

import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";

let client: Redis | undefined;

/** Lazily constructed so importing this module never reads the environment. */
export function redis(): Redis {
  client ??= new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
  return client;
}
