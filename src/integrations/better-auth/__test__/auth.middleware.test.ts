import { notFound } from "@tanstack/react-router"
import { APIError } from "better-auth/api"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod/v4"

import { ACTIONS, RESOURCES, ROLES } from "~/src/integrations/better-auth/auth.access"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"

interface MiddlewareOptions {
  readonly context: { readonly requestHeaders: Headers }
  readonly next: (arg?: unknown) => Promise<unknown>
}

type ServerHandler = (options: MiddlewareOptions) => unknown

const stubs = vi.hoisted(() => ({
  clientAddress: vi.fn<(headers: Headers) => string>(),
  getRequest: vi.fn<() => Request>(),
  getRequestSession: vi.fn(),
  handlers: [] as ((options: MiddlewareOptions) => unknown)[],
  withinRateLimit: vi.fn<(input: { key: string; limit: number; windowSeconds: number }) => Promise<boolean>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: stubs.getRequestSession }))

vi.mock("~/src/lib/rate-limit", () => ({ clientAddress: stubs.clientAddress, withinRateLimit: stubs.withinRateLimit }))

vi.mock("@tanstack/react-start/server", () => ({ getRequest: stubs.getRequest }))

vi.mock("@tanstack/react-start", () => {
  const builder = {
    middleware: () => builder,
    server: (handler: (options: MiddlewareOptions) => unknown) => {
      stubs.handlers.push(handler)

      return builder
    },
  }

  return { createMiddleware: () => builder }
})

const { RATE_LIMITS, authorized, withRateLimit } = await import("~/src/integrations/better-auth/auth.middleware")

const [requestBoundary] = stubs.handlers

const { hasPermission } = await import("~/src/integrations/better-auth/auth.access")

const next = vi.fn((arg?: unknown) => Promise.resolve(arg))

const requestHeaders = new Headers({ "cf-connecting-ip": "203.0.113.7" })

const lastRegisteredHandler = (): ServerHandler => {
  const handler = stubs.handlers.at(-1)
  if (handler === undefined) {
    throw new Error("the middleware did not register a server handler")
  }

  return handler
}

beforeEach(() => {
  vi.resetAllMocks()
  stubs.getRequest.mockReturnValue(new Request("https://store.test/account", { headers: requestHeaders }))
  next.mockImplementation((arg?: unknown) => Promise.resolve(arg))
})

const runAuthorized = (permission?: Parameters<typeof authorized>[0]): unknown => {
  authorized(permission)

  return lastRegisteredHandler()({ context: { requestHeaders }, next })
}

const sessionForRole = (role: string): { user: { id: string; role: string } } => ({ user: { id: "usr_1", role } })

describe("authorized middleware", () => {
  it("rejects an anonymous caller with UNAUTHORIZED", async () => {
    stubs.getRequestSession.mockResolvedValue(null)

    await expect(runAuthorized()).rejects.toThrow(new AppError(ERROR_CODES.UNAUTHORIZED))
    expect(next).not.toHaveBeenCalled()
  })

  it("admits a signed-in caller when no permission is required", async () => {
    stubs.getRequestSession.mockResolvedValue(sessionForRole(ROLES.CUSTOMER))

    await runAuthorized()

    expect(next).toHaveBeenCalledWith({ context: { auth: sessionForRole(ROLES.CUSTOMER) } })
  })

  it("rejects a customer asking for an admin permission", async () => {
    stubs.getRequestSession.mockResolvedValue(sessionForRole(ROLES.CUSTOMER))

    await expect(runAuthorized({ [RESOURCES.PRODUCT]: [ACTIONS.DELETE] })).rejects.toThrow(new AppError(ERROR_CODES.FORBIDDEN))
    expect(next).not.toHaveBeenCalled()
  })

  it("admits an admin holding the permission", async () => {
    stubs.getRequestSession.mockResolvedValue(sessionForRole(ROLES.ADMIN))

    await runAuthorized({ [RESOURCES.PRODUCT]: [ACTIONS.DELETE] })

    expect(next).toHaveBeenCalledTimes(1)
  })

  it("rejects an unrecognised role rather than letting it through", async () => {
    stubs.getRequestSession.mockResolvedValue(sessionForRole("superuser"))

    await expect(runAuthorized({ [RESOURCES.PRODUCT]: [ACTIONS.READ] })).rejects.toThrow(new AppError(ERROR_CODES.FORBIDDEN))
  })
})

describe("hasPermission", () => {
  it.each([[ACTIONS.CREATE], [ACTIONS.READ], [ACTIONS.UPDATE], [ACTIONS.DELETE], [ACTIONS.PUBLISH]])(
    "grants admin product:%s",
    (action) => {
      expect(hasPermission({ permission: { [RESOURCES.PRODUCT]: [action] }, role: ROLES.ADMIN })).toBe(true)
    },
  )

  it("grants admin the order refund permission", () => {
    expect(hasPermission({ permission: { [RESOURCES.ORDER]: [ACTIONS.REFUND] }, role: ROLES.ADMIN })).toBe(true)
  })

  it("lets an admin read and edit the store's content pages", () => {
    expect(hasPermission({ permission: { [RESOURCES.CONTENT]: [ACTIONS.READ, ACTIONS.UPDATE] }, role: ROLES.ADMIN })).toBe(true)
  })

  it("keeps customers out of the content editor", () => {
    expect(hasPermission({ permission: { [RESOURCES.CONTENT]: [ACTIONS.READ] }, role: ROLES.CUSTOMER })).toBe(false)
  })

  it("denies the customer role every product permission", () => {
    expect(hasPermission({ permission: { [RESOURCES.PRODUCT]: [ACTIONS.READ] }, role: ROLES.CUSTOMER })).toBe(false)
  })

  it.each([[null], [undefined], [""], ["admin "], ["ADMIN"], ["superuser"]])("fails closed for role %j", (role) => {
    expect(hasPermission({ permission: { [RESOURCES.PRODUCT]: [ACTIONS.READ] }, role })).toBe(false)
  })
})

const runBoundary = (result: Promise<unknown>): unknown => {
  if (requestBoundary === undefined) {
    throw new Error("withRequest did not register a server handler")
  }
  next.mockImplementation(() => result)

  return requestBoundary({ context: { requestHeaders }, next })
}

describe("request error boundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("puts the request headers on the context so callers never reach for the request again", async () => {
    await expect(runBoundary(Promise.resolve("ok"))).resolves.toBe("ok")
    expect(next).toHaveBeenCalledWith({ context: { requestHeaders: stubs.getRequest().headers } })
  })

  it("sanitises an unexpected failure into INTERNAL_ERROR", async () => {
    const error = new Error("SQL secret")

    await expect(runBoundary(Promise.reject(error))).rejects.toMatchObject({
      code: ERROR_CODES.INTERNAL_ERROR,
      message: ERROR_CODES.INTERNAL_ERROR,
    })
  })

  it("lets a not-found signal through untouched so the route answers 404", async () => {
    const missing = notFound()

    const failing = Promise.resolve().then(() => {
      throw missing
    })

    await expect(runBoundary(failing)).rejects.toBe(missing)
    expect(console.error).not.toHaveBeenCalled()
  })

  it("keeps the code of an AppError and drops its message", async () => {
    const error = new AppError(ERROR_CODES.FORBIDDEN, "private details")

    await expect(runBoundary(Promise.reject(error))).rejects.toMatchObject({
      code: ERROR_CODES.FORBIDDEN,
      message: ERROR_CODES.FORBIDDEN,
    })
  })

  it("maps a Better Auth API failure onto its translation key", async () => {
    const error = new APIError("BAD_REQUEST", { code: "INVALID_PASSWORD", message: "Private auth details" })

    await expect(runBoundary(Promise.reject(error))).rejects.toMatchObject({
      code: ERROR_CODES.AUTH_API_ERROR,
      message: "invalidPassword",
    })
  })

  it("maps a schema failure onto VALIDATION", async () => {
    const parsed = z.object({ email: z.email() }).safeParse({ email: "invalid" })
    if (parsed.success) {
      throw new Error("the schema should have rejected the input")
    }

    await expect(runBoundary(Promise.reject(parsed.error))).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
  })
})

const runRateLimit = (kind: string, rule: { readonly max: number; readonly window: number }): unknown => {
  withRateLimit(kind, rule)

  return lastRegisteredHandler()({ context: { requestHeaders }, next })
}

describe("rate limit middleware", () => {
  beforeEach(() => {
    stubs.clientAddress.mockReturnValue("203.0.113.7")
  })

  it("buckets the caller by action and client address", async () => {
    stubs.withinRateLimit.mockResolvedValue(true)

    await runRateLimit("update-customer-phone", RATE_LIMITS.SENSITIVE)

    expect(stubs.clientAddress).toHaveBeenCalledWith(requestHeaders)
    expect(stubs.withinRateLimit).toHaveBeenCalledWith({
      key: "update-customer-phone:203.0.113.7",
      limit: RATE_LIMITS.SENSITIVE.max,
      windowSeconds: RATE_LIMITS.SENSITIVE.window,
    })
    expect(next).toHaveBeenCalledTimes(1)
  })

  it("rejects a caller over the limit with TOO_MANY_REQUESTS", async () => {
    stubs.withinRateLimit.mockResolvedValue(false)

    await expect(runRateLimit("update-customer-phone", RATE_LIMITS.SENSITIVE)).rejects.toThrow(new AppError(ERROR_CODES.TOO_MANY_REQUESTS))
    expect(next).not.toHaveBeenCalled()
  })

  it("keeps a wider allowance for token exchanges than for sensitive writes", () => {
    expect(RATE_LIMITS.TOKEN.max).toBeGreaterThan(RATE_LIMITS.SENSITIVE.max)
    expect(RATE_LIMITS.TOKEN.window).toBe(RATE_LIMITS.SENSITIVE.window)
  })
})
