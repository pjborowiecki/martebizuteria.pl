import { type QueryClient } from "@tanstack/react-query"
import { redirect } from "@tanstack/react-router"

import { hasAdminAccess } from "~/src/integrations/better-auth/auth.access"
import { type getCurrentSession, getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { ROUTES } from "~/src/routes"

type Session = Awaited<ReturnType<typeof getCurrentSession>>

export type SessionUser = NonNullable<Session>["user"]

type GuardRoute = typeof ROUTES.ACCOUNT_OVERVIEW | typeof ROUTES.ADMIN | typeof ROUTES.AUTH_SIGN_IN

interface AuthRouteContext {
  readonly context: { readonly queryClient: QueryClient }
  readonly location: { readonly publicHref: string; readonly search: { readonly redirect?: unknown } }
  readonly preload: boolean
}

const SAME_SITE_PATH_PATTERN = /^\/(?![/\\])[!-[\]-~]*$/u

const resolveSafeRedirect = (value: unknown): string | undefined =>
  typeof value === "string" && SAME_SITE_PATH_PATTERN.test(value) ? value : undefined

export const postAuthRouteFor = (user: SessionUser): GuardRoute => (hasAdminAccess(user.role) ? ROUTES.ADMIN : ROUTES.ACCOUNT_OVERVIEW)

export const authEntryRouteFor = (user: SessionUser | undefined | null): GuardRoute =>
  user === undefined || user === null ? ROUTES.AUTH_SIGN_IN : postAuthRouteFor(user)

const redirectTo = (to: GuardRoute): never => {
  throw redirect({ to })
}

const redirectToSignIn = (intended: string): never => {
  const safe = resolveSafeRedirect(intended)

  throw redirect({ search: safe === undefined ? {} : { redirect: safe }, to: ROUTES.AUTH_SIGN_IN })
}

const redirectAfterSignIn = (user: SessionUser, intended: unknown): never => {
  const safe = resolveSafeRedirect(intended)
  if (safe === undefined) {
    return redirectTo(postAuthRouteFor(user))
  }

  throw redirect({ href: safe })
}

const loadRouteSession = ({ context: { queryClient }, preload }: AuthRouteContext, { recheck }: { readonly recheck: boolean }) =>
  queryClient.query(recheck && !preload ? { ...getCurrentSessionQuery, staleTime: 0 } : getCurrentSessionQuery)

export const requireSignedIn = async (route: AuthRouteContext): Promise<{ user: SessionUser }> => {
  const session = await loadRouteSession(route, { recheck: true })

  return session === null ? redirectToSignIn(route.location.publicHref) : { user: session.user }
}

export const requireAdmin = async (route: AuthRouteContext): Promise<{ user: SessionUser }> => {
  const { user } = await requireSignedIn(route)

  return hasAdminAccess(user.role) ? { user } : redirectTo(ROUTES.ACCOUNT_OVERVIEW)
}

export const requireCustomer = async (route: AuthRouteContext): Promise<{ user: SessionUser }> => {
  const { user } = await requireSignedIn(route)

  return hasAdminAccess(user.role) ? redirectTo(ROUTES.ADMIN) : { user }
}

export const redirectIfSignedIn = async (route: AuthRouteContext): Promise<void> => {
  const session = await loadRouteSession(route, { recheck: false })
  if (session !== null) {
    redirectAfterSignIn(session.user, route.location.search.redirect)
  }
}
