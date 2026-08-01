import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import {
  assertAllowedOrigin,
  assertJsonContentType,
  RequestRejected,
  toErrorResponse,
} from "@/lib/http/origin";
import { checkNameOwnership } from "@/lib/suins/ownership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  name: z.string().min(1).max(256),
});

export async function POST(request: Request): Promise<Response> {
  try {
    assertAllowedOrigin(request);
    assertJsonContentType(request);

    const session = await getCurrentSession();
    if (!session) {
      throw new RequestRejected("Sign in with a Sui wallet first", 401);
    }

    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const result = await checkNameOwnership(body.data.name, session.suiAddress);

    // An application projection. The SuiNS record and the raw Sui object never leave here.
    return Response.json({
      status: result.status,
      normalizedName: result.normalizedName,
      nftId: result.status === "owned" ? result.nftId : null,
      expirationTimestampMs:
        result.status === "owned" ? result.expirationTimestampMs : null,
      checkedAt: result.checkedAt,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
