import { NextResponse } from "next/server";

/**
 * Shared-secret guard for the API routes that wipe data or spend Anthropic
 * credit. Callers pass the secret in the `x-duro-token` header:
 *
 *   curl -X POST -H "x-duro-token: $DURO_ADMIN_TOKEN" "$BASE/api/reset"
 *
 * Fails CLOSED: if DURO_ADMIN_TOKEN is unset in the environment, there is no
 * value a caller could present, so every protected action is denied. That way a
 * misconfigured deploy is locked down rather than wide open.
 */

/** True when a shared secret is configured at all. */
export function isAdminAuthConfigured(): boolean {
  return Boolean(process.env.DURO_ADMIN_TOKEN);
}

/**
 * Returns a response to send back when the request is not authorized, or null
 * when it may proceed. Guard a handler by returning early:
 *
 *   const denied = requireAdmin(request);
 *   if (denied) return denied;
 */
export function requireAdmin(request: Request): NextResponse | null {
  const expected = process.env.DURO_ADMIN_TOKEN;
  if (!expected) {
    return NextResponse.json(
      {
        error:
          "This endpoint is disabled: DURO_ADMIN_TOKEN is not configured on the server.",
      },
      { status: 401 }
    );
  }
  if (request.headers.get("x-duro-token") !== expected) {
    return NextResponse.json(
      { error: "Unauthorized: missing or invalid x-duro-token header." },
      { status: 401 }
    );
  }
  return null;
}
