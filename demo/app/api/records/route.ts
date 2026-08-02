import { isValidSuiNSName, normalizeSuiNSName } from "@mysten/sui/utils";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import {
  assertAllowedOrigin,
  assertJsonContentType,
  RequestRejected,
  toErrorResponse,
} from "@/lib/http/origin";
import { ensRecordSchema } from "@/lib/namespace/schema";
import {
  NameNotOwnedError,
  NamespaceLabelCollisionError,
  readProfile,
  toEnsFullName,
  upsertSubname,
} from "@/lib/namespace/upsert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({ name: z.string().min(1).max(256) });

/** `null` when the name is well-formed but no Namespace record exists yet. */
async function profileFor(rawSuiName: string) {
  if (!isValidSuiNSName(rawSuiName)) {
    throw new RequestRejected("That is not a valid SuiNS name", 400);
  }
  const normalizedName = normalizeSuiNSName(rawSuiName, "dot");
  return readProfile(toEnsFullName(normalizedName));
}

/** The current public projection for a name. Read-only; ownership is not required. */
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      throw new RequestRejected("Sign in with a Sui wallet first", 401);
    }

    const query = querySchema.safeParse({
      name: new URL(request.url).searchParams.get("name"),
    });
    if (!query.success) {
      return Response.json({ error: "Invalid name" }, { status: 400 });
    }

    return Response.json(await profileFor(query.data.name));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * Validates the submitted record, rechecks direct name-NFT ownership, and upserts
 * `label.onsui.eth`. Ownership is rechecked by `upsertSubname` itself — an earlier
 * session or a previous check is never treated as permanent proof.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    assertAllowedOrigin(request);
    assertJsonContentType(request);

    const session = await getCurrentSession();
    if (!session) {
      throw new RequestRejected("Sign in with a Sui wallet first", 401);
    }

    const body = ensRecordSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    try {
      await upsertSubname({
        suiName: body.data.suiName,
        suiAddress: session.suiAddress,
        addresses: body.data.addresses,
        texts: body.data.texts,
        contenthash: body.data.contenthash,
        removeAddresses: body.data.removeAddresses,
        removeTextKeys: body.data.removeTextKeys,
      });
    } catch (error) {
      if (error instanceof NameNotOwnedError) {
        // "rpc-unavailable" is a distinct, retryable state: the write failed closed
        // because ownership could not be confirmed, not because it was disproved.
        const status = error.status === "rpc-unavailable" ? 503 : 403;
        return Response.json(
          { error: error.message, ownershipStatus: error.status },
          { status },
        );
      }
      if (error instanceof NamespaceLabelCollisionError) {
        return Response.json({ error: error.message }, { status: 409 });
      }
      throw error;
    }

    return Response.json(await profileFor(body.data.suiName));
  } catch (error) {
    return toErrorResponse(error);
  }
}
