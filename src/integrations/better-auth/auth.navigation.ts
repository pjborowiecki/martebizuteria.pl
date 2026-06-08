import { CONSTANTS } from "~/src/constants";

import type { SessionUser } from "~/src/integrations/better-auth/auth.guards";
import { hasAdminAccess } from "~/src/integrations/better-auth/auth.permissions";

import type { LocalizedTo } from "~/src/components/custom/localized-link";

export function localizedPostAuthRouteFor(user: SessionUser): LocalizedTo {
  return hasAdminAccess(user.role) ? CONSTANTS.ROUTES.ADMIN : CONSTANTS.ROUTES.ACCOUNT_OVERVIEW;
}

export function localizedAuthEntryRouteFor(user: SessionUser | undefined | null): LocalizedTo {
  if (user === undefined || user === null) {
    return CONSTANTS.ROUTES.AUTH_SIGN_IN;
  }

  return localizedPostAuthRouteFor(user);
}
