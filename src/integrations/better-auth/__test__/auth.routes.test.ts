import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ROLES } from "~/src/integrations/better-auth/auth.access"
import { type SessionUser } from "~/src/integrations/better-auth/auth.routes"

import { ROUTES } from "~/src/routes"

const stubs = vi.hoisted(() => ({ getCurrentSession: vi.fn() }))

vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getCurrentSession: stubs.getCurrentSession }))

vi.mock("@tanstack/react-router", () => ({ redirect: (options: { to: string }) => options }))

const { authEntryRouteFor, postAuthRouteFor, redirectAuthenticated, requireAdmin, requireCustomer, requireUser } =
  await import("~/src/integrations/better-auth/auth.routes")

const CREATED_AT = new Date("2026-01-01T00:00:00.000Z")

const userWithRole = (role: string): SessionUser => ({
  banned: null,
  createdAt: CREATED_AT,
  email: "shopper@marte.test",
  emailVerified: true,
  id: "usr_1",
  isAnonymous: null,
  name: "Shopper",
  role,
  twoFactorEnabled: null,
  updatedAt: CREATED_AT,
})

const signedInAs = (role: string): void => {
  stubs.getCurrentSession.mockResolvedValue({ session: { id: "ses_1" }, user: userWithRole(role) })
}

beforeEach(() => {
  vi.resetAllMocks()
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

describe("route guards", () => {
  it("redirects an anonymous visitor to sign in", async () => {
    stubs.getCurrentSession.mockResolvedValue(null)

    await expect(requireUser()).rejects.toStrictEqual({ search: {}, to: ROUTES.AUTH_SIGN_IN })
  })

  it("keeps the page the visitor asked for so sign-in can return them to it", async () => {
    stubs.getCurrentSession.mockResolvedValue(null)

    await expect(requireUser("/account/orders/order-1")).rejects.toStrictEqual({
      search: { redirect: "/account/orders/order-1" },
      to: ROUTES.AUTH_SIGN_IN,
    })
  })

  it.each([["https://evil.test/steal"], ["//evil.test/steal"], ["mailto:thief@evil.test"], ["account/orders"]])(
    "refuses to carry %s off to another site after sign-in",
    async (intended) => {
      stubs.getCurrentSession.mockResolvedValue(null)

      await expect(requireUser(intended)).rejects.toStrictEqual({ search: {}, to: ROUTES.AUTH_SIGN_IN })
    },
  )

  it("returns the signed-in user", async () => {
    signedInAs(ROLES.CUSTOMER)

    await expect(requireUser()).resolves.toStrictEqual(userWithRole(ROLES.CUSTOMER))
  })

  it("admits an admin to the admin panel", async () => {
    signedInAs(ROLES.ADMIN)

    await expect(requireAdmin()).resolves.toStrictEqual(userWithRole(ROLES.ADMIN))
  })

  it("turns a customer away from the admin panel", async () => {
    signedInAs(ROLES.CUSTOMER)

    await expect(requireAdmin()).rejects.toStrictEqual({ to: ROUTES.ACCOUNT_OVERVIEW })
  })

  it("admits a customer to the account area", async () => {
    signedInAs(ROLES.CUSTOMER)

    await expect(requireCustomer()).resolves.toStrictEqual(userWithRole(ROLES.CUSTOMER))
  })

  it("turns an admin away from the account area", async () => {
    signedInAs(ROLES.ADMIN)

    await expect(requireCustomer()).rejects.toStrictEqual({ to: ROUTES.ADMIN })
  })

  it("leaves an anonymous visitor on the auth pages", async () => {
    stubs.getCurrentSession.mockResolvedValue(null)

    await expect(redirectAuthenticated()).resolves.toBeUndefined()
  })

  it("moves a signed-in visitor off the auth pages", async () => {
    signedInAs(ROLES.ADMIN)

    await expect(redirectAuthenticated()).rejects.toStrictEqual({ to: ROUTES.ADMIN })
  })
})
