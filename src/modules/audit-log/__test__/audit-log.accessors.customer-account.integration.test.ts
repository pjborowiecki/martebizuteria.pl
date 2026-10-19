import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:") }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

import { getCustomerActivityAuditRows, getCustomerLoginAuditPage } from "~/src/modules/audit-log/audit-log.accessors"
import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { CUSTOMER_AUDIT_TIMELINE_LIMIT } from "~/src/modules/customer-activity/customer-activity.constants"

const CUSTOMER = "user-1"

const OTHER_CUSTOMER = "user-2"

const DAY_MS = 86_400_000

const dayOf = (day: number): number => Date.UTC(2026, 0, day)

interface AuditFixture {
  readonly action: string
  readonly createdAt: number
  readonly id: string
  readonly ip: string | null
  readonly resourceId: string
}

const insertAudit = ({ action, createdAt, id, ip, resourceId }: AuditFixture): void => {
  sqlite
    .prepare(`insert into audit_log (id, resource_id, action, created_at, ip) values (?, ?, ?, ?, ?)`)
    .run(id, resourceId, action, createdAt, ip)
}

beforeEach(() => {
  sqlite.exec(`
    drop table if exists audit_log;

    create table audit_log (
      id text primary key, resource_id text, action text not null, created_at integer not null, ip text, detail text, metadata text
    );
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("getCustomerLoginAuditPage", () => {
  const FIRST_PAGE = { limit: 10, offset: 0, userId: CUSTOMER }

  const insertSignIns = (): void => {
    insertAudit({ action: AUDIT_LOG_ACTION.AUTH_LOGIN, createdAt: dayOf(1), id: "audit-1", ip: "203.0.113.7", resourceId: CUSTOMER })
    insertAudit({
      action: AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED,
      createdAt: dayOf(2),
      id: "audit-2",
      ip: "198.51.100.4",
      resourceId: CUSTOMER,
    })
    insertAudit({ action: AUDIT_LOG_ACTION.AUTH_LOGOUT, createdAt: dayOf(3), id: "audit-3", ip: null, resourceId: CUSTOMER })
    insertAudit({ action: AUDIT_LOG_ACTION.ORDER_PLACED, createdAt: dayOf(4), id: "audit-4", ip: null, resourceId: CUSTOMER })
    insertAudit({ action: AUDIT_LOG_ACTION.AUTH_LOGIN, createdAt: dayOf(5), id: "audit-5", ip: null, resourceId: OTHER_CUSTOMER })
  }

  it("lists only the customer's own sign-in attempts newest first, with their count", async () => {
    insertSignIns()

    await expect(getCustomerLoginAuditPage(FIRST_PAGE)).resolves.toStrictEqual({
      rows: [
        { action: AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED, createdAt: new Date(dayOf(2)), id: "audit-2", ip: "198.51.100.4" },
        { action: AUDIT_LOG_ACTION.AUTH_LOGIN, createdAt: new Date(dayOf(1)), id: "audit-1", ip: "203.0.113.7" },
      ],
      total: 2,
    })
  })

  it("keeps only the successful or only the failed attempts", async () => {
    insertSignIns()

    const failed = await getCustomerLoginAuditPage({ ...FIRST_PAGE, status: "failed" })
    const successful = await getCustomerLoginAuditPage({ ...FIRST_PAGE, status: "success" })

    expect(failed.rows.map((row) => row.id)).toStrictEqual(["audit-2"])
    expect(successful).toMatchObject({ rows: [{ id: "audit-1" }], total: 1 })
  })

  it("finds the attempts from an address", async () => {
    insertSignIns()

    await expect(getCustomerLoginAuditPage({ ...FIRST_PAGE, search: "203.0" })).resolves.toMatchObject({
      rows: [{ id: "audit-1" }],
      total: 1,
    })
  })

  it("pages through every attempt, so no sign-in drops out of the history", async () => {
    for (let index = 0; index < 25; index += 1) {
      insertAudit({
        action: AUDIT_LOG_ACTION.AUTH_LOGIN,
        createdAt: dayOf(1) + index * DAY_MS,
        id: `audit-${String(index).padStart(2, "0")}`,
        ip: null,
        resourceId: CUSTOMER,
      })
    }

    const lastPage = await getCustomerLoginAuditPage({ limit: 10, offset: 20, userId: CUSTOMER })

    expect(lastPage.total).toBe(25)
    expect(lastPage.rows).toHaveLength(5)
    expect(lastPage.rows.at(-1)?.createdAt).toStrictEqual(new Date(dayOf(1)))
  })
})

describe("a customer with a long order history", () => {
  const LONG_HISTORY_CUSTOMER = "user-with-long-history"

  const orderIds = Array.from({ length: 150 }, (_, index) => `history-${String(index).padStart(3, "0")}`)

  beforeEach(() => {
    for (const [index, id] of orderIds.entries()) {
      insertAudit({ action: AUDIT_LOG_ACTION.ORDER_PLACED, createdAt: dayOf(10) + index, id: `audit-${id}`, ip: null, resourceId: id })
    }
  })

  it("reads the newest activity across the customer's account and every one of their orders", async () => {
    insertAudit({
      action: AUDIT_LOG_ACTION.AUTH_LOGIN,
      createdAt: dayOf(20),
      id: "audit-login",
      ip: null,
      resourceId: LONG_HISTORY_CUSTOMER,
    })
    insertAudit({ action: AUDIT_LOG_ACTION.ORDER_SHIPPED, createdAt: dayOf(21), id: "audit-other", ip: null, resourceId: "someone-else" })

    const rows = await getCustomerActivityAuditRows(LONG_HISTORY_CUSTOMER, orderIds)

    expect(rows.map((row) => row.resourceId)).toStrictEqual([
      LONG_HISTORY_CUSTOMER,
      ...orderIds.toReversed().slice(0, CUSTOMER_AUDIT_TIMELINE_LIMIT - 1),
    ])
  })
})
