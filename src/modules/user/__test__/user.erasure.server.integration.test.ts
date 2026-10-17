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

const ordersSchema = z.array(z.object({ id: z.string(), metadata: z.string().nullable() }))

const remainingIds = (table: "audit_log" | "newsletter_subscriber"): string[] =>
  idsSchema.parse(sqlite.prepare(`select id from ${table} order by id`).all()).map(({ id }) => id)

const insertAuditAt = (createdAt: number, [id, action, resourceId]: readonly [string, string, string]): void => {
  sqlite
    .prepare(
      `insert into audit_log (id, action, actor_name, actor_role, category, created_at, resource_id, severity, target) values (?, ?, 'System', 'system', 'customers', ?, ?, 'info', ?)`,
    )
    .run(id, action, createdAt, resourceId, resourceId)
}

const insertAudit = (id: string, action: string, resourceId: string): void => {
  insertAuditAt(0, [id, action, resourceId])
}

const CHANGED_AT = Date.UTC(2026, 9, 1)

const changeAnnasAddress = (): void => {
  sqlite.prepare("update user set email = ? where id = ?").run("anna.new@example.com", ANNA.id)
  sqlite.prepare("update user_email_history set replaced_at = ? where user_id = ? and replaced_at is not null").run(CHANGED_AT, ANNA.id)
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

  it("also deletes the entries kept under an address the account used before, from the time it held that address", async () => {
    changeAnnasAddress()
    insertAuditAt(CHANGED_AT - 1, ["anna-old-newsletter", "newsletter.subscriber_confirmed", ANNA.email])
    insertAuditAt(CHANGED_AT + 1, ["next-holder-newsletter", "newsletter.subscriber_confirmed", ANNA.email])

    await eraseAccountData({ email: "anna.new@example.com", id: ANNA.id })

    expect(remainingIds("audit_log")).toStrictEqual(["next-holder-newsletter", "ola-sign-in", "order-placed"])
  })

  it("keeps the orders the account placed with an address other than its last one from going to whoever takes that address", async () => {
    sqlite.exec(`
      delete from "order";
      insert into "order" (id, user_id, email, order_number, created_at, updated_at) values
        ('with-old-address', '${ANNA.id}', 'anna.old@example.com', 'MRT-2026-00001', 0, 0),
        ('with-last-address', '${ANNA.id}', '${ANNA.email}', 'MRT-2026-00002', 0, 0),
        ('ola-order', '${OTHER.id}', 'anna.old@example.com', 'MRT-2026-00003', 0, 0);
    `)

    await eraseAccountData(ANNA)

    expect(ordersSchema.parse(sqlite.prepare(`select id, metadata from "order" order by id`).all())).toStrictEqual([
      { id: "ola-order", metadata: null },
      { id: "with-last-address", metadata: null },
      { id: "with-old-address", metadata: '{"keptFromClaims":true}' },
    ])
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
