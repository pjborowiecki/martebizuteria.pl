import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { deleteExpiredAuditLogs } from "~/src/modules/audit-log/use-cases/delete-expired-audit-logs.server"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const DAY_MS = 86_400_000

const NOW = Date.parse("2026-10-10T03:00:00.000Z")

const CUT_OFFS = {
  customerActivityBefore: new Date(NOW - 90 * DAY_MS),
  entryBefore: new Date("2024-10-10T03:00:00.000Z"),
  limit: 100,
  signInHistoryBefore: new Date("2025-10-10T03:00:00.000Z"),
}

interface EntryRow {
  readonly action: string
  readonly category: string
  readonly createdAt: number
  readonly id: string
}

const insertEntry = ({ action, category, createdAt, id }: EntryRow): void => {
  sqlite
    .prepare(
      "insert into audit_log (id, action, category, severity, actor_name, actor_role, target, ip, created_at) values (?, ?, ?, 'info', 'Ada Nowak', 'customer', 'Ada Nowak', '203.0.113.7', ?)",
    )
    .run(id, action, category, createdAt)
}

const remainingIds = (): string[] =>
  z
    .array(z.object({ id: z.string() }))
    .parse(sqlite.prepare("select id from audit_log order by id").all())
    .map(({ id }) => id)

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  sqlite.exec("delete from audit_log")
})

afterAll(() => {
  sqlite.close()
})

describe("deleteExpiredAuditLogs on the migrated schema", () => {
  it("deletes page views and cart events older than 90 days and keeps newer ones", async () => {
    insertEntry({ action: "customer.page_viewed", category: "customers", createdAt: NOW - 91 * DAY_MS, id: "page-view-91d" })
    insertEntry({ action: "customer.cart_item_added", category: "customers", createdAt: NOW - 91 * DAY_MS, id: "cart-item-91d" })
    insertEntry({ action: "customer.cart_abandoned", category: "customers", createdAt: NOW - 91 * DAY_MS, id: "cart-abandoned-91d" })
    insertEntry({ action: "customer.page_viewed", category: "customers", createdAt: NOW - 89 * DAY_MS, id: "page-view-89d" })

    await expect(deleteExpiredAuditLogs(CUT_OFFS)).resolves.toBe(3)

    expect(remainingIds()).toStrictEqual(["page-view-89d"])
  })

  it("deletes sign-ins, failed sign-ins and sign-outs older than 12 months and keeps newer ones", async () => {
    insertEntry({ action: "auth.login", category: "auth", createdAt: Date.parse("2025-09-10T03:00:00.000Z"), id: "login-13m" })
    insertEntry({
      action: "auth.login_failed",
      category: "auth",
      createdAt: Date.parse("2025-09-10T03:00:00.000Z"),
      id: "login-failed-13m",
    })
    insertEntry({ action: "auth.logout", category: "auth", createdAt: Date.parse("2025-09-10T03:00:00.000Z"), id: "logout-13m" })
    insertEntry({ action: "auth.login", category: "auth", createdAt: Date.parse("2025-11-10T03:00:00.000Z"), id: "login-11m" })

    await expect(deleteExpiredAuditLogs(CUT_OFFS)).resolves.toBe(3)

    expect(remainingIds()).toStrictEqual(["login-11m"])
  })

  it("keeps every other entry for two years, past the shorter periods of activity and sign-ins", async () => {
    insertEntry({
      action: "product.updated",
      category: "catalog",
      createdAt: Date.parse("2024-09-10T03:00:00.000Z"),
      id: "product-updated-25m",
    })
    insertEntry({ action: "email.sent", category: "email", createdAt: Date.parse("2024-09-10T03:00:00.000Z"), id: "email-sent-25m" })
    insertEntry({ action: "order.placed", category: "orders", createdAt: Date.parse("2024-11-10T03:00:00.000Z"), id: "order-placed-23m" })
    insertEntry({
      action: "customer.registered",
      category: "customers",
      createdAt: Date.parse("2024-11-10T03:00:00.000Z"),
      id: "customer-registered-23m",
    })
    insertEntry({ action: "settings.updated", category: "settings", createdAt: NOW - 100 * DAY_MS, id: "settings-updated-100d" })

    await expect(deleteExpiredAuditLogs(CUT_OFFS)).resolves.toBe(2)

    expect(remainingIds()).toStrictEqual(["customer-registered-23m", "order-placed-23m", "settings-updated-100d"])
  })

  it("deletes at most the batch size at a time", async () => {
    for (const id of ["page-view-a", "page-view-b", "page-view-c"]) {
      insertEntry({ action: "customer.page_viewed", category: "customers", createdAt: NOW - 91 * DAY_MS, id })
    }

    await expect(deleteExpiredAuditLogs({ ...CUT_OFFS, limit: 2 })).resolves.toBe(2)
    await expect(deleteExpiredAuditLogs({ ...CUT_OFFS, limit: 2 })).resolves.toBe(1)
    expect(remainingIds()).toStrictEqual([])
  })
})
