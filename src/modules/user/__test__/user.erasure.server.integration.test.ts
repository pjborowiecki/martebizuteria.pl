import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

const effects = vi.hoisted(() => ({
  deleteStripeCustomer: vi.fn<(userId: string) => Promise<void>>(),
  recordCustomerDeletionFailedAudit: vi.fn<(email: string, options?: { detail?: string; resourceId?: string }) => void>(),
  scheduleAdminAuditLogInvalidation: vi.fn<() => void>(),
  scheduleAdminNewsletterSubscribersInvalidation: vi.fn<() => void>(),
}))

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock("~/src/integrations/stripe/stripe.customer.server", () => ({ deleteStripeCustomer: effects.deleteStripeCustomer }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminAuditLogInvalidation: effects.scheduleAdminAuditLogInvalidation,
  scheduleAdminNewsletterSubscribersInvalidation: effects.scheduleAdminNewsletterSubscribersInvalidation,
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordCustomerDeletionFailedAudit: effects.recordCustomerDeletionFailedAudit,
}))

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { eraseAccountData } from "~/src/modules/user/user.erasure.server"

const ANNA = { email: "anna@example.com", id: "user-anna" }

const OTHER = { email: "ola@example.com", id: "user-ola" }

const idsSchema = z.array(z.object({ id: z.string() }))

const remainingIds = (table: "audit_log" | "newsletter_subscriber"): string[] =>
  idsSchema.parse(sqlite.prepare(`select id from ${table} order by id`).all()).map(({ id }) => id)

const insertAudit = (id: string, action: string, resourceId: string): void => {
  sqlite
    .prepare(
      `insert into audit_log (id, action, actor_name, actor_role, category, created_at, resource_id, severity, target) values (?, ?, 'System', 'system', 'customers', 0, ?, 'info', ?)`,
    )
    .run(id, action, resourceId, resourceId)
}

const insertSubscriber = (id: string, email: string, userId: string | null): void => {
  sqlite
    .prepare(
      `insert into newsletter_subscriber (id, email, locale, source, status, token, user_id, created_at, updated_at) values (?, ?, 'pl-PL', 'landing', 'confirmed', ?, ?, 0, 0)`,
    )
    .run(id, email, `token-${id}`, userId)
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  vi.clearAllMocks()
  effects.deleteStripeCustomer.mockResolvedValue()
  sqlite.exec(`
    delete from audit_log;
    delete from newsletter_subscriber;
    delete from user;
    insert into user (id, name, email, created_at, updated_at) values
      ('${ANNA.id}', 'Anna Kowalska', '${ANNA.email}', 0, 0),
      ('${OTHER.id}', 'Ola Nowak', '${OTHER.email}', 0, 0);
  `)
  insertAudit("anna-page-view", "customer.page_viewed", ANNA.id)
  insertAudit("anna-sign-in", "auth.login", ANNA.id)
  insertAudit("anna-reset-email-failed", "email.failed", ANNA.email)
  insertAudit("ola-sign-in", "auth.login", OTHER.id)
  insertAudit("order-placed", "order.placed", "order-1")
  insertSubscriber("anna-linked", "anna.old@example.com", ANNA.id)
  insertSubscriber("anna-by-address", "anna@example.com", null)
  insertSubscriber("ola", OTHER.email, OTHER.id)
})

afterAll(() => {
  sqlite.close()
})

describe("eraseAccountData", () => {
  it("deletes the account's Stripe customer before anything in the database", async () => {
    effects.deleteStripeCustomer.mockImplementation(() => {
      expect(remainingIds("audit_log")).toContain("anna-page-view")

      return Promise.resolve()
    })

    await expect(eraseAccountData(ANNA)).resolves.toBe(true)

    expect(effects.deleteStripeCustomer).toHaveBeenCalledExactlyOnceWith(ANNA.id)
  })

  it("deletes the account's activity log, sign-in history and email failures, and keeps every other entry", async () => {
    await eraseAccountData(ANNA)

    expect(remainingIds("audit_log")).toStrictEqual(["ola-sign-in", "order-placed"])
  })

  it("deletes the newsletter subscription linked to the account and the one made with its address", async () => {
    await eraseAccountData({ ...ANNA, email: "Anna@Example.com" })

    expect(remainingIds("newsletter_subscriber")).toStrictEqual(["ola"])
  })

  it("refreshes the admin audit log and subscriber list once the entries are gone", async () => {
    await eraseAccountData(ANNA)

    expect(effects.scheduleAdminAuditLogInvalidation).toHaveBeenCalledOnce()
    expect(effects.scheduleAdminNewsletterSubscribersInvalidation).toHaveBeenCalledOnce()
  })

  it("keeps everything and records why when Stripe cannot delete the customer", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    effects.deleteStripeCustomer.mockRejectedValue(new Error("stripe is unreachable"))

    await expect(eraseAccountData(ANNA)).resolves.toBe(false)

    expect(remainingIds("audit_log")).toHaveLength(5)
    expect(remainingIds("newsletter_subscriber")).toHaveLength(3)
    expect(effects.recordCustomerDeletionFailedAudit).toHaveBeenCalledExactlyOnceWith(ANNA.email, {
      detail: "Error: stripe is unreachable",
      resourceId: ANNA.id,
    })
    expect(consoleError).toHaveBeenCalledWith(
      `[Account deletion] Kept user ${ANNA.id} because its Stripe customer could not be deleted:`,
      expect.any(Error),
    )
    expect(effects.scheduleAdminAuditLogInvalidation).not.toHaveBeenCalled()
    expect(effects.scheduleAdminNewsletterSubscribersInvalidation).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
