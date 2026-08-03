import "server-only";

import { env } from "@/lib/env";

/** An explicitly rejected request. The message is safe to return to the caller. */
export class RequestRejected extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "RequestRejected";
  }
}

/**
 * The relying party is the configured origin, never a forwarded header. Browsers send
 * `Origin` on every cross-origin-unsafe method, including same-origin POST.
 */
export function assertAllowedOrigin(request: Request): void {
  if (request.headers.get("origin") !== env.APP_ORIGIN) {
    throw new RequestRejected("Origin is not allowed", 403);
  }
}

export function assertJsonContentType(request: Request): void {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new RequestRejected("Expected application/json", 415);
  }
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof RequestRejected) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error("Unhandled request error", error);
  return Response.json({ error: "Unexpected server error" }, { status: 500 });
}
