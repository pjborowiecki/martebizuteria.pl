import { redirect } from "@tanstack/react-router"

import { hasAdminAccess } from "~/src/integrations/better-auth/auth.access"
import { getCurrentSession } from "~/src/integrations/better-auth/auth.session"

import { ROUTES } from "~/src/routes"

type Session = Awaited<ReturnType<typeof getCurrentSession>>

export type SessionUser = NonNullable<Session>["user"]

type GuardRoute = typeof ROUTES.ACCOUNT_OVERVIEW | typeof ROUTES.ADMIN | typeof ROUTES.AUTH_SIGN_IN

const redirectTo = (to: GuardRoute): never => {
  throw redirect({
    to,
  })
}

export const postAuthRouteFor = (user: SessionUser): GuardRoute => (hasAdminAccess(user.role) ? ROUTES.ADMIN : ROUTES.ACCOUNT_OVERVIEW)

export const authEntryRouteFor = (user: SessionUser | undefined | null): GuardRoute =>
  user === undefined || user === null ? ROUTES.AUTH_SIGN_IN : postAuthRouteFor(user)

export const requireUser = async (): Promise<SessionUser> => {
  const session = await getCurrentSession()

  return session?.user ?? redirectTo(ROUTES.AUTH_SIGN_IN)
}

export const requireAdmin = async (): Promise<SessionUser> => {
  const user = await requireUser()

  return hasAdminAccess(user.role) ? user : redirectTo(ROUTES.ACCOUNT_OVERVIEW)
}

export const requireCustomer = async (): Promise<SessionUser> => {
  const user = await requireUser()

  return hasAdminAccess(user.role) ? redirectTo(ROUTES.ADMIN) : user
}

export const redirectAuthenticated = async (): Promise<void> => {
  const session = await getCurrentSession()
  if (session?.user) {
    redirectTo(postAuthRouteFor(session.user))
  }
}
