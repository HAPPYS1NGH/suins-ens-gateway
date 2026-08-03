import { endSession } from "@/lib/auth/session";
import { assertAllowedOrigin, toErrorResponse } from "@/lib/http/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    assertAllowedOrigin(request);
    await endSession();
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
