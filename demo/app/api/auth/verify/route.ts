import { z } from "zod";

import { startSession } from "@/lib/auth/session";
import { verifyChallengeSignature } from "@/lib/auth/verify";
import { env } from "@/lib/env";
import {
  assertAllowedOrigin,
  assertJsonContentType,
  toErrorResponse,
} from "@/lib/http/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  challengeId: z.string().min(1).max(200),
  signature: z.string().min(1).max(20_000),
});

export async function POST(request: Request): Promise<Response> {
  try {
    assertAllowedOrigin(request);
    assertJsonContentType(request);

    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const challenge = await verifyChallengeSignature({
      challengeId: body.data.challengeId,
      signature: body.data.signature,
      expectedOrigin: env.APP_ORIGIN,
      expectedChain: `sui:${env.SUI_NETWORK}`,
    });

    const session = await startSession(challenge.suiAddress);

    return Response.json({
      suiAddress: session.suiAddress,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
