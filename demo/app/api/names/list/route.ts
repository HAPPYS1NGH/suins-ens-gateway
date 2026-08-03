import { getCurrentSession } from "@/lib/auth/session";
import { RequestRejected, toErrorResponse } from "@/lib/http/origin";
import { listOwnedSuiNames } from "@/lib/suins/names";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns the SuiNS name NFTs owned by the signed-in wallet.
 * Requires an active Sui wallet session; ownership is read live from Sui.
 */
export async function GET(): Promise<Response> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      throw new RequestRejected("Sign in with a Sui wallet first", 401);
    }

    const names = await listOwnedSuiNames(session.suiAddress);
    return Response.json({ names });
  } catch (error) {
    return toErrorResponse(error);
  }
}
