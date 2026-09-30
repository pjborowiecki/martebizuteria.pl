import { auth } from "~/src/integrations/better-auth/auth.server"
import { getRequestSession } from "~/src/integrations/better-auth/auth.session"

import { recordAuthLoginFailedAudit, recordAuthLogoutAudit, resolveAuthAuditActor } from "~/src/modules/audit-log/audit-log.events.server"

import { resolveRequestIp } from "~/src/lib/request"

import { ROUTES } from "~/src/routes"

const resolveAuthPathname = (request: Request): string => {
  const { pathname } = new URL(request.url)

  return pathname.startsWith(AUTH_API_PREFIX) ? pathname.slice(AUTH_API_PREFIX.length) : pathname
}

const isEmailSignInAttempt = (authPath: string, method: string): boolean => method === "POST" && authPath === ROUTES.API_AUTH.SIGN_IN_EMAIL

const isSignOutAttempt = (authPath: string, method: string): boolean => method === "POST" && authPath === ROUTES.API_AUTH.SIGN_OUT

const parseSignInEmail = async (request: Request): Promise<string | undefined> => {
  try {
    const body: unknown = await request.clone().json()
    if (typeof body !== "object" || body === null || !("email" in body)) {
      return undefined
    }

    const { email } = body

    return typeof email === "string" && email !== "" ? email : undefined
  } catch {
    return undefined
  }
}

export const handleAuthRequestWithAudit = async (request: Request): Promise<Response> => {
  const authPath = resolveAuthPathname(request)
  const shouldAuditFailedLogin = isEmailSignInAttempt(authPath, request.method)
  const shouldAuditLogout = isSignOutAttempt(authPath, request.method)
  const signInEmail = shouldAuditFailedLogin ? await parseSignInEmail(request) : undefined
  const ip = shouldAuditFailedLogin || shouldAuditLogout ? resolveRequestIp(request.headers) : undefined
  const sessionBeforeSignOut = shouldAuditLogout ? await getRequestSession(request) : undefined
  const response = await auth.handler(request)
  if (shouldAuditFailedLogin && !response.ok && signInEmail !== undefined) {
    recordAuthLoginFailedAudit(signInEmail, {
      detail: signInEmail,
      ip,
      metadata: {
        email: signInEmail,
      },
    })
  }

  if (shouldAuditLogout && response.ok && sessionBeforeSignOut?.user !== undefined) {
    recordAuthLogoutAudit(resolveAuthAuditActor(sessionBeforeSignOut.user), {
      ip,
      resourceId: sessionBeforeSignOut.user.id,
    })
  }

  return response
}

const AUTH_API_PREFIX = "/api/auth"
