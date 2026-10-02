import { QueryClient } from "@tanstack/react-query"
import { isRedirect } from "@tanstack/react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ROLES } from "~/src/integrations/better-auth/auth.access"
import {
  type SessionUser,
  authEntryRouteFor,
  postAuthRouteFor,
  redirectIfSignedIn,
  requireAdmin,
  requireCustomer,
  requireSignedIn,
} from "~/src/integrations/better-auth/auth.routes"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"

import { ROUTES } from "~/src/routes"

interface SessionLookup {
  readonly session: { readonly id: string; readonly token: string; readonly userId: string }
  readonly user: SessionUser
}

interface RouteOptions {
  readonly preload?: boolean
  readonly queryClient?: QueryClient
  readonly redirect?: unknown
}

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn<() => Promise<SessionLookup | null>>() }))

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({ handler: (handler: unknown) => handler }),
  createServerOnlyFn: (fn: unknown) => fn,
}))
vi.mock("@tanstack/react-start/server", () => ({ getRequest: () => new Request("https://store.test/") }))
vi.mock("~/src/integrations/better-auth/auth.server", () => ({ auth: { api: { getSession } } }))

const CREATED_AT = new Date("2026-01-01T00:00:00.000Z")

const SESSION_STALE_MS = 60_000

const userWithRole = (role: string, id = "usr_1"): SessionUser => ({
  banned: null,
  createdAt: CREATED_AT,
  email: "shopper@marte.test",
  emailVerified: true,
  id,
  isAnonymous: null,
  name: "Shopper",
  role,
  twoFactorEnabled: null,
  updatedAt: CREATED_AT,
})

const clientSessionFor = (role: string, id = "usr_1") => ({ session: { id: `ses_${id}`, userId: id }, user: userWithRole(role, id) })

const signedInAs = (role: string, id = "usr_1"): void => {
  getSession.mockResolvedValue({ session: { id: `ses_${id}`, token: "secret", userId: id }, user: userWithRole(role, id) })
}

const routeAt = (publicHref: string, { preload = false, queryClient = new QueryClient(), redirect }: RouteOptions = {}) => ({
  context: { queryClient },
  location: { publicHref, search: { redirect } },
  preload,
})

const clientWithCachedSession = (session: ReturnType<typeof clientSessionFor> | null): QueryClient => {
  const queryClient = new QueryClient()
  queryClient.setQueryData(SESSION_QUERY_KEYS.CURRENT, session)

  return queryClient
}

const thrownBy = (pending: Promise<unknown>): Promise<unknown> =>
  pending.then(
    (value) => ({ resolvedWith: value }),
    (error: unknown) => error,
  )

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("post-authentication landing route", () => {
  it("sends an admin to the admin panel", () => {
    expect(postAuthRouteFor(userWithRole(ROLES.ADMIN))).toBe(ROUTES.ADMIN)
  })

  it("sends a customer straight to the account overview rather than through the account index", () => {
    expect(postAuthRouteFor(userWithRole(ROLES.CUSTOMER))).toBe(ROUTES.ACCOUNT_OVERVIEW)
  })

  it.each([[null], [undefined]])("sends a caller with no user (%j) to sign in", (user) => {
    expect(authEntryRouteFor(user)).toBe(ROUTES.AUTH_SIGN_IN)
  })

  it("sends a signed-in caller to their own workspace", () => {
    expect(authEntryRouteFor(userWithRole(ROLES.ADMIN))).toBe(ROUTES.ADMIN)
    expect(authEntryRouteFor(userWithRole(ROLES.CUSTOMER))).toBe(ROUTES.ACCOUNT_OVERVIEW)
  })
})

describe("signed-in guards", () => {
  it.each([
    ["any signed-in area", requireSignedIn],
    ["the admin panel", requireAdmin],
    ["the account area", requireCustomer],
  ])("sends an anonymous visitor from %s to sign in, remembering the localized page they asked for", async (_area, guard) => {
    getSession.mockResolvedValue(null)

    const thrown = await thrownBy(guard(routeAt("/en-US/account/orders/order-1")))

    expect(isRedirect(thrown)).toBe(true)
    expect(thrown).toHaveProperty("options.to", ROUTES.AUTH_SIGN_IN)
    expect(thrown).toHaveProperty("options.search", { redirect: "/en-US/account/orders/order-1" })
  })

  it.each([
    ["https://evil.test/steal"],
    ["//evil.test/steal"],
    [String.raw`/\evil.test/steal`],
    ["/\t/evil.test/steal"],
    ["/ evil.test"],
    ["/\u0000evil.test"],
    ["/\u007Fevil.test"],
    ["/ż"],
    ["mailto:thief@evil.test"],
    ["account/orders"],
  ])("refuses to carry %j along to sign-in", async (intended) => {
    getSession.mockResolvedValue(null)

    const thrown = await thrownBy(requireSignedIn(routeAt(intended)))

    expect(thrown).toHaveProperty("options.search", {})
  })

  it("hands the signed-in user to the routes below", async () => {
    signedInAs(ROLES.CUSTOMER)

    await expect(requireSignedIn(routeAt("/account/overview"))).resolves.toStrictEqual({ user: userWithRole(ROLES.CUSTOMER) })
  })

  it("admits an admin to the admin panel", async () => {
    signedInAs(ROLES.ADMIN)

    await expect(requireAdmin(routeAt("/admin"))).resolves.toStrictEqual({ user: userWithRole(ROLES.ADMIN) })
  })

  it("turns a customer away from the admin panel", async () => {
    signedInAs(ROLES.CUSTOMER)

    const thrown = await thrownBy(requireAdmin(routeAt("/admin")))

    expect(thrown).toHaveProperty("options.to", ROUTES.ACCOUNT_OVERVIEW)
  })

  it("admits a customer to the account area", async () => {
    signedInAs(ROLES.CUSTOMER)

    await expect(requireCustomer(routeAt("/account"))).resolves.toStrictEqual({ user: userWithRole(ROLES.CUSTOMER) })
  })

  it("turns an admin away from the account area", async () => {
    signedInAs(ROLES.ADMIN)

    const thrown = await thrownBy(requireCustomer(routeAt("/account")))

    expect(thrown).toHaveProperty("options.to", ROUTES.ADMIN)
  })

  it("surfaces a failed session lookup as an error instead of guessing", async () => {
    getSession.mockRejectedValue(new Error("Session store unavailable"))

    await expect(requireSignedIn(routeAt("/account"))).rejects.toThrow("Session store unavailable")
    expect(getSession).toHaveBeenCalledOnce()
  })
})

describe("signed-in guards and the cached session", () => {
  it("asks the server again on every real navigation into a guarded area", async () => {
    signedInAs(ROLES.CUSTOMER)
    const queryClient = clientWithCachedSession(clientSessionFor(ROLES.CUSTOMER))

    await requireSignedIn(routeAt("/account/orders", { queryClient }))

    expect(getSession).toHaveBeenCalledOnce()
  })

  it("turns away an admin who was demoted since the last page", async () => {
    signedInAs(ROLES.ADMIN)
    const queryClient = new QueryClient()
    await requireAdmin(routeAt("/admin", { queryClient }))
    signedInAs(ROLES.CUSTOMER)

    const thrown = await thrownBy(requireAdmin(routeAt("/admin/orders", { queryClient })))

    expect(thrown).toHaveProperty("options.to", ROUTES.ACCOUNT_OVERVIEW)
    expect(getSession).toHaveBeenCalledTimes(2)
  })

  it("shares one session lookup between guards that run at the same time", async () => {
    signedInAs(ROLES.CUSTOMER)
    const queryClient = new QueryClient()

    await Promise.all([requireSignedIn(routeAt("/account", { queryClient })), requireCustomer(routeAt("/account", { queryClient }))])

    expect(getSession).toHaveBeenCalledOnce()
  })

  it("trusts a session younger than a minute while a link is only being preloaded", async () => {
    const queryClient = clientWithCachedSession(clientSessionFor(ROLES.CUSTOMER))

    await expect(requireSignedIn(routeAt("/account/orders", { preload: true, queryClient }))).resolves.toStrictEqual({
      user: userWithRole(ROLES.CUSTOMER),
    })
    expect(getSession).not.toHaveBeenCalled()
  })

  it("asks again when preloading with a session older than a minute", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    signedInAs(ROLES.CUSTOMER)
    const queryClient = clientWithCachedSession(clientSessionFor(ROLES.CUSTOMER))
    vi.setSystemTime(Date.now() + SESSION_STALE_MS + 1)

    await requireSignedIn(routeAt("/account/orders", { preload: true, queryClient }))

    expect(getSession).toHaveBeenCalledOnce()
  })

  it("leaves the session it loaded in the cache for the components that render next, without its token", async () => {
    signedInAs(ROLES.CUSTOMER)
    const queryClient = new QueryClient()

    await requireSignedIn(routeAt("/account/overview", { queryClient }))

    expect(queryClient.getQueryData(SESSION_QUERY_KEYS.CURRENT)).toStrictEqual(clientSessionFor(ROLES.CUSTOMER))
  })
})

describe("auth pages guard", () => {
  it("leaves an anonymous visitor on the auth pages", async () => {
    getSession.mockResolvedValue(null)

    await expect(redirectIfSignedIn(routeAt("/auth/sign-in"))).resolves.toBeUndefined()
  })

  it("moves a signed-in visitor on to their own workspace", async () => {
    signedInAs(ROLES.ADMIN)

    const thrown = await thrownBy(redirectIfSignedIn(routeAt("/auth/sign-in")))

    expect(thrown).toHaveProperty("options.to", ROUTES.ADMIN)
  })

  it("returns a visitor who has just signed in to the localized page they originally asked for", async () => {
    signedInAs(ROLES.CUSTOMER)

    const thrown = await thrownBy(redirectIfSignedIn(routeAt("/en-US/auth/sign-in", { redirect: "/en-US/account/orders/order-7" })))

    expect(isRedirect(thrown)).toBe(true)
    expect(thrown).toHaveProperty("options.href", "/en-US/account/orders/order-7")
  })

  it.each([["https://evil.test/steal"], ["//evil.test/steal"], [String.raw`/\evil.test/steal`], ["/ż"], [["/a", "/b"]]])(
    "ignores the unsafe destination %j and uses the visitor's own workspace",
    async (intended) => {
      signedInAs(ROLES.CUSTOMER)

      const thrown = await thrownBy(redirectIfSignedIn(routeAt("/auth/sign-in", { redirect: intended })))

      expect(thrown).toHaveProperty("options.to", ROUTES.ACCOUNT_OVERVIEW)
    },
  )

  it("reuses a fresh cached session instead of asking the server again", async () => {
    const queryClient = clientWithCachedSession(null)

    await expect(redirectIfSignedIn(routeAt("/auth/sign-in", { queryClient }))).resolves.toBeUndefined()
    expect(getSession).not.toHaveBeenCalled()
  })
})
