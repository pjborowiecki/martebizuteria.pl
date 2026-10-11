import { isNotFound } from "@tanstack/react-router"
import { createMiddleware, createServerOnlyFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { isAPIError } from "better-auth/api"
import { ZodError } from "zod"

import { type Permission, hasPermission, needsTwoFactorSetup } from "~/src/integrations/better-auth/auth.access"
import { authErrorKey } from "~/src/integrations/better-auth/auth.errors"
import { getRequestSession } from "~/src/integrations/better-auth/auth.session"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { RATE_LIMIT_WINDOW_SECONDS } from "~/src/modules/rate-limit/rate-limit.constants"

import { clientAddress, withinRateLimit } from "~/src/lib/rate-limit"

export const RATE_LIMITS = {
  BROWSING: { max: 120, window: RATE_LIMIT_WINDOW_SECONDS.REQUEST },
  CHECKOUT: { max: 10, window: RATE_LIMIT_WINDOW_SECONDS.REQUEST },
  SENSITIVE: { max: 3, window: RATE_LIMIT_WINDOW_SECONDS.REQUEST },
  TOKEN: { max: 5, window: RATE_LIMIT_WINDOW_SECONDS.REQUEST },
} as const

const ERROR_REASON_PATTERN = /^[A-Z][A-Z\d_]*$/u

const handleRequestError = (error: unknown): never => {
  if (isNotFound(error)) {
    throw error
  }

  if (error instanceof AppError) {
    throw new AppError(error.code, ERROR_REASON_PATTERN.test(error.message) ? error.message : error.code)
  }

  if (isAPIError(error)) {
    throw new AppError(ERROR_CODES.AUTH_API_ERROR, authErrorKey(error))
  }

  if (error instanceof ZodError) {
    throw new AppError(ERROR_CODES.VALIDATION)
  }
  console.error("Server function failed", error)

  throw new AppError(ERROR_CODES.INTERNAL_ERROR)
}

export const withRequest = createMiddleware({ type: "function" }).server(({ next }) =>
  next({ context: { requestHeaders: getRequest().headers } }).catch(handleRequestError),
)

export const authorized = (permission?: Permission) =>
  createMiddleware({ type: "function" })
    .middleware([withRequest])
    .server(async ({ next }) => {
      const session = await getRequestSession()
      if (session === null) {
        throw new AppError(ERROR_CODES.UNAUTHORIZED)
      }

      if (permission !== undefined && (!hasPermission({ permission, role: session.user.role }) || needsTwoFactorSetup(session.user))) {
        throw new AppError(ERROR_CODES.FORBIDDEN)
      }

      return next({ context: { auth: session } })
    })

interface RateLimitRule {
  readonly max: number
  readonly window: number
}

export const assertWithinRateLimit = createServerOnlyFn(
  async (kind: string, { max, window }: RateLimitRule, requestHeaders: Headers): Promise<void> => {
    const admitted = await withinRateLimit({ key: `${kind}:${clientAddress(requestHeaders)}`, limit: max, windowSeconds: window })
    if (!admitted) {
      throw new AppError(ERROR_CODES.TOO_MANY_REQUESTS)
    }
  },
)

export const withRateLimit = (kind: string, rule: RateLimitRule) =>
  createMiddleware({ type: "function" })
    .middleware([withRequest])
    .server(async ({ context, next }) => {
      await assertWithinRateLimit(kind, rule, context.requestHeaders)

      return next()
    })
