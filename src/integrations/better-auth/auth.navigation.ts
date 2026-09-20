import { type SessionUser } from "~/src/integrations/better-auth/auth.guards"
import { hasAdminAccess } from "~/src/integrations/better-auth/auth.permissions"

import { type LocalizedTo } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"
export const localizedPostAuthRouteFor = (user: SessionUser): LocalizedTo =>
  hasAdminAccess(user.role) ? ROUTES.ADMIN : ROUTES.ACCOUNT_OVERVIEW

export const localizedAuthEntryRouteFor = (user: SessionUser | undefined | null): LocalizedTo => {
  if (user === undefined || user === null) {
    return ROUTES.AUTH_SIGN_IN
  }
  return localizedPostAuthRouteFor(user)
}
