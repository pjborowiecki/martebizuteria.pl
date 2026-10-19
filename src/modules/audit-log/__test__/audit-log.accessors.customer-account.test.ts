import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getCustomerActivityAuditRows, getCustomerLoginAuditPage } from "~/src/modules/audit-log/audit-log.accessors"
import { CUSTOMER_AUDIT_TIMELINE_LIMIT } from "~/src/modules/customer-activity/customer-activity.constants"

const database = vi.hoisted(() => {
  const state: { joins: number; limits: number[]; offsets: number[]; rows: unknown[]; tables: string[] } = {
    joins: 0,
    limits: [],
    offsets: [],
    rows: [],
    tables: [],
  }

  const makeChain = (): unknown =>
    Object.assign(Promise.resolve(state.rows), {
      leftJoin: () => {
        state.joins += 1

        return makeChain()
      },
      limit: (value: number) => {
        state.limits.push(value)

        return makeChain()
      },
      offset: (value: number) => {
        state.offsets.push(value)

        return makeChain()
      },
      orderBy: () => makeChain(),
      where: () => makeChain(),
    })

  return { makeChain, state }
})

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", async () => {
  const { getTableName } = await import("drizzle-orm")

  return {
    db: {
      batch: () => Promise.resolve([[], database.state.rows]),
      select: () => ({
        from: (table: Parameters<typeof getTableName>[0]) => {
          database.state.tables.push(getTableName(table))

          return database.makeChain()
        },
      }),
    },
  }
})

describe("getCustomerActivityAuditRows", () => {
  beforeEach(() => {
    database.state.joins = 0
    database.state.limits = []
    database.state.offsets = []
    database.state.rows = []
    database.state.tables = []
  })

  it("reads the audit log and caps the timeline at the shared limit", async () => {
    database.state.rows = [{ action: "auth.login" }]

    await expect(getCustomerActivityAuditRows("user-1")).resolves.toStrictEqual([{ action: "auth.login" }])
    expect(database.state.tables).toStrictEqual(["audit_log"])
    expect(database.state.limits).toStrictEqual([CUSTOMER_AUDIT_TIMELINE_LIMIT])
  })
})

describe("getCustomerLoginAuditPage", () => {
  it("counts no attempts when the count query returns no row", async () => {
    database.state.rows = [{ action: "auth.login", createdAt: new Date("2026-10-01T00:00:00.000Z"), id: "audit-1", ip: null }]

    await expect(getCustomerLoginAuditPage({ limit: 10, offset: 0, userId: "user-1" })).resolves.toStrictEqual({
      rows: database.state.rows,
      total: 0,
    })
  })
})
