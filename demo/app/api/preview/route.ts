import { isValidSuiNSName, normalizeSuiNSName } from "@mysten/sui/utils";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { previewResolution } from "@/lib/ens/preview";
import { RequestRejected, toErrorResponse } from "@/lib/http/origin";
import { readProfile, toEnsFullName } from "@/lib/namespace/upsert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({ name: z.string().min(1).max(256) });

/**
 * Read-only: resolves the live ENS view of a name next to what was just saved.
 * Gated on a session only so this cannot be used as a free public SuiNS-resolution
 * oracle — ownership of the name is irrelevant to what this endpoint returns.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      throw new RequestRejected("Sign in with a Sui wallet first", 401);
    }

    const query = querySchema.safeParse({
      name: new URL(request.url).searchParams.get("name"),
    });
    if (!query.success || !isValidSuiNSName(query.data.name)) {
      return Response.json({ error: "Invalid name" }, { status: 400 });
    }

    const normalizedName = normalizeSuiNSName(query.data.name, "dot");
    const fullName = toEnsFullName(normalizedName);
    const profile = await readProfile(fullName);

    const preview = await previewResolution({
      ensName: fullName,
      textKeys: profile ? Object.keys(profile.texts) : [],
    });

    return Response.json({ profile, preview });
  } catch (error) {
    return toErrorResponse(error);
  }
}
