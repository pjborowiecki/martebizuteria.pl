import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { type AuthBrowser, createPasswordCustomer, openAuthBrowser } from "~/src/platform/testing/lib/auth-browser"
import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

vi.mock("cloudflare:workers", () => ({
  env: {
    AUTH_GOOGLE_CLIENT_ID: "test-google-client",
    AUTH_GOOGLE_CLIENT_SECRET: "test-google-secret",
    AUTH_SECRET: "local-test-auth-secret-with-at-least-thirty-two-characters",
  },
}))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail: vi.fn(() => Promise.resolve()) }))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "en-US" }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordAuthEmailChangedAudit: vi.fn(),
  recordAuthLoginAudit: vi.fn(),
  recordCustomerDeletedAudit: vi.fn(),
  recordCustomerRegisteredAudit: vi.fn(),
  resolveAuthAuditActor: vi.fn((user: { id: string }) => `actor:${user.id}`),
}))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminCustomersInvalidation: vi.fn(),
}))
vi.mock("~/src/modules/order/order.claim.server", () => ({ claimGuestOrdersForUser: vi.fn(() => Promise.resolve(0)) }))
vi.mock("~/src/modules/newsletter-subscriber/newsletter-subscriber.accessors", () => ({
  linkSubscriberToUser: vi.fn(() => Promise.resolve()),
}))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: {} }))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const errorBody = z.object({ code: z.string() })

const roleRow = z.object({ role: z.string() })

const roleOf = (userId: string): string => roleRow.parse(sqlite.prepare("select role from user where id = ?").get(userId)).role

const accountCount = (email: string): number =>
  z.object({ total: z.number() }).parse(sqlite.prepare("select count(*) as total from user where email = ?").get(email)).total

const signedInAdmin = async (email: string, ip: string): Promise<Readonly<{ browser: AuthBrowser; userId: string }>> => {
  const userId = await createPasswordCustomer(email)
  const browser = openAuthBrowser(ip)
  await browser.signIn(email)
  sqlite.prepare("update user set role = 'admin', two_factor_enabled = 1 where id = ?").run(userId)

  return { browser, userId }
}

const refusal = async (response: Response): Promise<Readonly<{ code: string; status: number }>> => ({
  code: errorBody.parse(await response.json()).code,
  status: response.status,
})

const REFUSED = { code: "ROLE_MANAGED_IN_TEAM_SETTINGS", status: 403 } as const

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  vi.clearAllMocks()
})

afterAll(() => {
  sqlite.close()
})

describe("Better Auth's admin endpoints", () => {
  it("refuse to set a role, so admin access changes only through Settings, Team and its rules", async () => {
    const admin = await signedInAdmin("set-role-admin@marte.test", "203.0.113.30")
    const customerId = await createPasswordCustomer("set-role-customer@marte.test")

    const promoted = await admin.browser.post("/admin/set-role", { role: "admin", userId: customerId })
    const demotedSelf = await admin.browser.post("/admin/set-role", { role: "customer", userId: admin.userId })

    await expect(refusal(promoted)).resolves.toStrictEqual(REFUSED)
    await expect(refusal(demotedSelf)).resolves.toStrictEqual(REFUSED)
    expect([roleOf(customerId), roleOf(admin.userId)]).toStrictEqual(["customer", "admin"])
  })

  it("refuse an account update that carries a role, and still make one that does not", async () => {
    const admin = await signedInAdmin("update-admin@marte.test", "203.0.113.31")
    const customerId = await createPasswordCustomer("update-customer@marte.test")

    const promoted = await admin.browser.post("/admin/update-user", { data: { name: "Grace", role: "admin" }, userId: customerId })
    const renamed = await admin.browser.post("/admin/update-user", { data: { name: "Grace" }, userId: customerId })

    await expect(refusal(promoted)).resolves.toStrictEqual(REFUSED)
    expect(renamed.status).toBe(200)
    expect(roleOf(customerId)).toBe("customer")
  })

  it.each([
    { body: { role: "admin" }, email: "created-admin@marte.test", name: "a role" },
    { body: { data: { role: "admin" } }, email: "created-data-admin@marte.test", name: "a role among the extra fields" },
  ])("refuse to create an account with $name", async ({ body, email }) => {
    const admin = await signedInAdmin(`creator-${email}`, "203.0.113.32")

    const response = await admin.browser.post("/admin/create-user", { ...body, email, name: "Mallory" })

    await expect(refusal(response)).resolves.toStrictEqual(REFUSED)
    expect(accountCount(email)).toBe(0)
  })

  it("still create a customer account when no role is given", async () => {
    const admin = await signedInAdmin("creator-plain@marte.test", "203.0.113.33")

    const response = await admin.browser.post("/admin/create-user", { email: "plain-created@marte.test", name: "Zofia" })

    expect(response.status).toBe(200)
    expect(accountCount("plain-created@marte.test")).toBe(1)
  })
})

describe("Better Auth's remove-user endpoint", () => {
  it("refuses to delete an admin account, which keeps its admin access until it is removed in Settings, Team", async () => {
    const admin = await signedInAdmin("remover-admin@marte.test", "203.0.113.34")
    const colleague = await createPasswordCustomer("colleague-admin@marte.test")
    sqlite.prepare("update user set role = 'admin' where id = ?").run(colleague)

    const response = await admin.browser.post("/admin/remove-user", { userId: colleague })

    await expect(refusal(response)).resolves.toStrictEqual({ code: "CANNOT_DELETE_ADMIN", status: 403 })
    expect(accountCount("colleague-admin@marte.test")).toBe(1)
  })

  it("still deletes a customer account", async () => {
    const admin = await signedInAdmin("remover-customer@marte.test", "203.0.113.35")
    const customerId = await createPasswordCustomer("removed-customer@marte.test")

    const response = await admin.browser.post("/admin/remove-user", { userId: customerId })

    expect(response.status).toBe(200)
    expect(accountCount("removed-customer@marte.test")).toBe(0)
  })

  it("tells a customer nothing about whether the account is an admin", async () => {
    const adminId = await createPasswordCustomer("probed-admin@marte.test")
    sqlite.prepare("update user set role = 'admin' where id = ?").run(adminId)
    await createPasswordCustomer("prober@marte.test")
    const prober = openAuthBrowser("203.0.113.37")
    await prober.signIn("prober@marte.test")

    const response = await prober.post("/admin/remove-user", { userId: adminId })

    expect(response.status).toBe(403)
    expect(errorBody.parse(await response.json()).code).not.toBe("CANNOT_DELETE_ADMIN")
  })

  it("leaves a request without an account to Better Auth's own checks", async () => {
    const admin = await signedInAdmin("remover-nobody@marte.test", "203.0.113.36")

    const response = await admin.browser.post("/admin/remove-user", {})

    expect(response.status).toBe(400)
  })
})
