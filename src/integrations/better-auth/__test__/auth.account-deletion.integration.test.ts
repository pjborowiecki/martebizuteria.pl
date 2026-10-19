import Stripe from "stripe"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { CUSTOMER_PASSWORD, createPasswordCustomer, openAuthBrowser } from "~/src/platform/testing/lib/auth-browser"
import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

const stripeCustomers = vi.hoisted(() => ({ del: vi.fn<(customerId: string) => Promise<{ deleted: true }>>() }))

const audit = vi.hoisted(() => ({
  recordAuthLoginAudit: vi.fn(),
  recordCustomerDeletedAudit: vi.fn(),
  recordCustomerDeletionFailedAudit: vi.fn(),
  recordCustomerRegisteredAudit: vi.fn(),
  recordEmailFailedAudit: vi.fn(),
  resolveAuthAuditActor: vi.fn((user: { email: string }) => `actor:${user.email}`),
}))

vi.mock("cloudflare:workers", () => ({
  env: {
    AUTH_GOOGLE_CLIENT_ID: "test-google-client",
    AUTH_GOOGLE_CLIENT_SECRET: "test-google-secret",
    AUTH_SECRET: "local-test-auth-secret-with-at-least-thirty-two-characters",
  },
}))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { customers: stripeCustomers } }))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail: vi.fn(() => Promise.resolve(undefined)) }))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "en-US" }))
vi.mock("~/src/modules/audit-log/audit-log.utils", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  resolveAuthAuditActor: audit.resolveAuthAuditActor,
}))
vi.mock("~/src/modules/audit-log/use-cases/record-auth-audit.server", () => audit)
vi.mock("~/src/modules/audit-log/use-cases/record-customer-audit.server", () => audit)
vi.mock("~/src/modules/audit-log/use-cases/record-email-audit.server", () => audit)
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminAuditLogInvalidation: vi.fn(),
  scheduleAdminCustomersInvalidation: vi.fn(),
  scheduleAdminNewsletterSubscribersInvalidation: vi.fn(),
}))
vi.mock(import("~/src/modules/order/use-cases/claim-guest-orders.server"), async (importOriginal) => ({
  ...(await importOriginal()),
  claimGuestOrdersForUser: vi.fn(() => Promise.resolve(0)),
}))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const EMAIL = "anna@marte.test"

const STRIPE_CUSTOMER_ID = "cus_anna"

const errorBody = z.object({ code: z.string() })

const count = (query: string, ...params: string[]): number =>
  z.object({ total: z.number() }).parse(sqlite.prepare(`select count(*) as total from ${query}`).get(...params)).total

const auditLogIds = (): string[] =>
  z
    .array(z.object({ id: z.string() }))
    .parse(sqlite.prepare("select id from audit_log order by id").all())
    .map(({ id }) => id)

const storedStripeCustomerId = (): string | null =>
  z.object({ customerId: z.string().nullable() }).parse(sqlite.prepare("select stripe_customer_id as customerId from user").get())
    .customerId

const keptOrder = (): Readonly<{ email: string; userId: string | null }> =>
  z.object({ email: z.string(), userId: z.string().nullable() }).parse(sqlite.prepare(`select email, user_id as userId from "order"`).get())

const createCustomerWithData = async (): Promise<string> => {
  sqlite
    .prepare(
      `insert into newsletter_subscriber (id, email, locale, source, status, token, created_at, updated_at) values ('subscriber', ?, 'en-US', 'account', 'confirmed', 'token', 0, 0)`,
    )
    .run(EMAIL)
  const userId = await createPasswordCustomer(EMAIL)
  sqlite.prepare(`update user set stripe_customer_id = ? where id = ?`).run(STRIPE_CUSTOMER_ID, userId)
  sqlite
    .prepare(
      `insert into address (id, address1, city, country_code, user_id, created_at, updated_at) values ('address', 'ul. Wąska 1', 'Bochnia', 'PL', ?, 0, 0)`,
    )
    .run(userId)
  sqlite
    .prepare(`insert into "order" (id, email, order_number, user_id, created_at, updated_at) values ('order', ?, 'MRT-1', ?, 0, 0)`)
    .run(EMAIL, userId)
  sqlite.exec(`
    insert into audit_log (id, action, actor_name, actor_role, category, created_at, resource_id, severity, target) values
      ('page-view', 'customer.page_viewed', 'Ada', 'customer', 'customers', 0, '${userId}', 'info', '${EMAIL}'),
      ('reset-email-failed', 'email.failed', 'System', 'system', 'email', 0, '${EMAIL}', 'error', '${EMAIL}'),
      ('order-placed', 'order.placed', 'System', 'system', 'orders', 0, 'order', 'success', 'order');
  `)

  return userId
}

const deleteAccount = async (ip: string): Promise<Response> => {
  const browser = openAuthBrowser(ip)
  const signIn = await browser.signIn(EMAIL)
  expect(signIn.status).toBe(200)

  return browser.post("/delete-user", { password: CUSTOMER_PASSWORD })
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  vi.clearAllMocks()
  stripeCustomers.del.mockResolvedValue({ deleted: true })
  vi.spyOn(console, "error").mockImplementation(() => {})
  sqlite.exec(`delete from "order"; delete from audit_log; delete from newsletter_subscriber; delete from user; delete from rate_limit;`)
})

afterAll(() => {
  sqlite.close()
})

describe("a customer deleting their account", () => {
  it("deletes the Stripe customer, the activity log, the newsletter subscription, the addresses and the sessions", async () => {
    const userId = await createCustomerWithData()

    const response = await deleteAccount("198.51.100.30")

    expect(response.status).toBe(200)
    expect(stripeCustomers.del).toHaveBeenCalledExactlyOnceWith(STRIPE_CUSTOMER_ID)
    expect(count("user")).toBe(0)
    expect(count("account where user_id = ?", userId)).toBe(0)
    expect(count("session where user_id = ?", userId)).toBe(0)
    expect(count("address")).toBe(0)
    expect(count("newsletter_subscriber")).toBe(0)
    expect(auditLogIds()).toStrictEqual(["order-placed"])
    expect(audit.recordCustomerDeletedAudit).toHaveBeenCalledExactlyOnceWith(`actor:${EMAIL}`, {
      actor: `actor:${EMAIL}`,
      ip: "198.51.100.30",
    })
  })

  it("keeps the order for the accounting records, no longer linked to an account", async () => {
    await createCustomerWithData()

    await deleteAccount("198.51.100.31")

    expect(keptOrder()).toStrictEqual({ email: EMAIL, userId: null })
  })

  it("goes ahead when Stripe no longer has the customer", async () => {
    await createCustomerWithData()
    stripeCustomers.del.mockRejectedValue(
      new Stripe.errors.StripeInvalidRequestError({ code: "resource_missing", message: `No such customer: '${STRIPE_CUSTOMER_ID}'` }),
    )

    const response = await deleteAccount("198.51.100.32")

    expect(response.status).toBe(200)
    expect(count("user")).toBe(0)
  })

  it("keeps the whole account, still able to sign in, when Stripe cannot delete the customer", async () => {
    const userId = await createCustomerWithData()
    stripeCustomers.del.mockRejectedValue(new Error("stripe is unreachable"))

    const response = await deleteAccount("198.51.100.33")

    expect(response.status).toBe(503)
    expect(errorBody.parse(await response.json()).code).toBe("STRIPE_CUSTOMER_NOT_DELETED")
    expect(storedStripeCustomerId()).toBe(STRIPE_CUSTOMER_ID)
    expect(count("session where user_id = ?", userId)).toBe(1)
    expect([count("address"), count("newsletter_subscriber")]).toStrictEqual([1, 1])
    expect(auditLogIds()).toStrictEqual(["order-placed", "page-view", "reset-email-failed"])
    const signInAgain = await openAuthBrowser("198.51.100.34").signIn(EMAIL)
    expect(signInAgain.status).toBe(200)
  })
})

describe("an admin deleting their own account", () => {
  it("is refused before anything is erased, so the shop cannot lose its admins this way", async () => {
    const userId = await createCustomerWithData()
    const browser = openAuthBrowser("198.51.100.35")
    await browser.signIn(EMAIL)
    sqlite.prepare("update user set role = 'admin' where id = ?").run(userId)

    const response = await browser.post("/delete-user", { password: CUSTOMER_PASSWORD })

    expect(response.status).toBe(403)
    expect(errorBody.parse(await response.json()).code).toBe("CANNOT_DELETE_ADMIN")
    expect(stripeCustomers.del).not.toHaveBeenCalled()
    expect(count("user")).toBe(1)
    expect(count("session where user_id = ?", userId)).toBe(1)
    expect(auditLogIds()).toStrictEqual(["order-placed", "page-view", "reset-email-failed"])
  })
})
