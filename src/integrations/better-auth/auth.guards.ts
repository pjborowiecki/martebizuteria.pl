import { redirect } from "@tanstack/react-router";

import { CONSTANTS } from "~/src/constants";

import { hasAdminAccess } from "~/src/integrations/better-auth/auth.permissions";

import { sessionQueries } from "~/src/modules/session/session.queries";

type Session = Awaited<ReturnType<typeof sessionQueries.getSessionFn>>;
export type SessionUser = NonNullable<Session>["user"];

const SIGN_IN_ROUTE = `/{-$locale}${CONSTANTS.ROUTES.AUTH_SIGN_IN}` as const;
const ACCOUNT_ROUTE = `/{-$locale}${CONSTANTS.ROUTES.ACCOUNT}` as const;
const ADMIN_ROUTE = `/{-$locale}${CONSTANTS.ROUTES.ADMIN}` as const;

type GuardRoute = typeof ACCOUNT_ROUTE | typeof ADMIN_ROUTE | typeof SIGN_IN_ROUTE;

function redirectTo(to: GuardRoute): never {
  redirect({ throw: true, to });
  throw new Error(`Expected redirect to ${to}`);
}

export function postAuthRouteFor(user: SessionUser): GuardRoute {
  return hasAdminAccess(user.role) ? ADMIN_ROUTE : ACCOUNT_ROUTE;
}

export async function requireUser(): Promise<SessionUser> {
  const session = await sessionQueries.getSessionFn();
  return session?.user ?? redirectTo(SIGN_IN_ROUTE);
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  return hasAdminAccess(user.role) ? user : redirectTo(ACCOUNT_ROUTE);
}

export async function requireCustomer(): Promise<SessionUser> {
  const user = await requireUser();
  return hasAdminAccess(user.role) ? redirectTo(ADMIN_ROUTE) : user;
}

export async function redirectAuthenticated(): Promise<void> {
  const session = await sessionQueries.getSessionFn();

  if (session?.user) {
    redirectTo(postAuthRouteFor(session.user));
  }
}
