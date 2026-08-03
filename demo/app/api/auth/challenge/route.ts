import { randomBytes, randomUUID } from "node:crypto";

import { isValidSuiAddress, normalizeSuiAddress } from "@mysten/sui/utils";
import { z } from "zod";

import { CHALLENGE_TTL_SECONDS, createChallenge } from "@/lib/auth/store";
import { env } from "@/lib/env";
import {
  assertAllowedOrigin,
  assertJsonContentType,
  toErrorResponse,
} from "@/lib/http/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  suiAddress: z.string().refine(isValidSuiAddress, "Invalid Sui address"),
});

export async function POST(request: Request): Promise<Response> {
  try {
    assertAllowedOrigin(request);
    assertJsonContentType(request);

    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const issuedAt = new Date();
    const challenge = await createChallenge({
      suiAddress: normalizeSuiAddress(body.data.suiAddress),
      uri: env.APP_ORIGIN,
      origin: env.APP_ORIGIN,
      chain: `sui:${env.SUI_NETWORK}`,
      nonce: randomBytes(32).toString("hex"),
      issuedAt: issuedAt.toISOString(),
      expirationTime: new Date(
        issuedAt.getTime() + CHALLENGE_TTL_SECONDS * 1000,
      ).toISOString(),
      challengeId: randomUUID(),
    });

    // Only the identifier and the message the wallet must sign leave the server.
    return Response.json({
      challengeId: challenge.challengeId,
      message: challenge.message,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
