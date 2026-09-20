import { redirect } from "@tanstack/react-router"

import { hasAdminAccess } from "~/src/integrations/better-auth/auth.permissions"

import { getSessionFn } from "~/src/modules/session/use-cases/get-session"

import { ROUTES } from "~/src/routes"
const redirectTo = (to: GuardRoute): never => {
  throw redirect({
    to,
  })
}
export const postAuthRouteFor = (user: SessionUser): GuardRoute => (hasAdminAccess(user.role) ? ADMIN_ROUTE : ACCOUNT_ROUTE)

export const requireUser = async (): Promise<SessionUser> => {
  const session = await getSessionFn()
  return session?.user ?? redirectTo(SIGN_IN_ROUTE)
}
export const requireAdmin = async (): Promise<SessionUser> => {
  const user = await requireUser()
  return hasAdminAccess(user.role) ? user : redirectTo(ACCOUNT_ROUTE)
}
export const requireCustomer = async (): Promise<SessionUser> => {
  const user = await requireUser()
  return hasAdminAccess(user.role) ? redirectTo(ADMIN_ROUTE) : user
}
export const redirectAuthenticated = async (): Promise<void> => {
  const session = await getSessionFn()
  if (session?.user) {
    redirectTo(postAuthRouteFor(session.user))
  }
}
type Session = Awaited<ReturnType<typeof getSessionFn>>
export type SessionUser = NonNullable<Session>["user"]
const SIGN_IN_ROUTE = `/{-$locale}${ROUTES.AUTH_SIGN_IN}` as const
const ACCOUNT_ROUTE = `/{-$locale}${ROUTES.ACCOUNT}` as const
const ADMIN_ROUTE = `/{-$locale}${ROUTES.ADMIN}` as const
type GuardRoute = typeof ACCOUNT_ROUTE | typeof ADMIN_ROUTE | typeof SIGN_IN_ROUTE
