import { getRequestHeaders } from "@tanstack/react-start/server";

import { auth } from "~/src/integrations/better-auth/auth._server";
import { hasAdminAccess } from "~/src/integrations/better-auth/auth.permissions";

export const AUTH_ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED"
} as const;

/**
 * Server-side admin guard for server functions. Reads the request session and
 * throws `UNAUTHORIZED` unless the caller is an authenticated admin. Keep this
 * the single source of truth so every mutation guards access the same way.
 */
export async function assertAdmin(): Promise<void> {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });

  if (!hasAdminAccess(session?.user?.role)) {
    throw new Error(AUTH_ERROR_CODES.UNAUTHORIZED);
  }
}
