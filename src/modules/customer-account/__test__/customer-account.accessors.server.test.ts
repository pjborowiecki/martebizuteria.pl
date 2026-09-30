import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  getCustomerActivityAuditRows,
  getCustomerOrderRows,
  getOrderItemsForOrders,
} from "~/src/modules/customer-account/customer-account.accessors.server"
import { CUSTOMER_ACCOUNT_ORDERS_LIMIT } from "~/src/modules/customer-account/customer-account.constants"
import { CUSTOMER_AUDIT_TIMELINE_LIMIT } from "~/src/modules/customer-activity/customer-activity.constants"

const database = vi.hoisted(() => {
  const state: { limits: number[]; rows: unknown[]; tables: string[] } = { limits: [], rows: [], tables: [] }

  const makeChain = (): unknown =>
    Object.assign(Promise.resolve(state.rows), {
      limit: (value: number) => {
        state.limits.push(value)

        return Promise.resolve(state.rows)
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
    database.state.limits = []
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

describe("getCustomerOrderRows", () => {
  beforeEach(() => {
    database.state.limits = []
    database.state.rows = []
    database.state.tables = []
  })

  it("reads the order table with the account page's default limit", async () => {
    await getCustomerOrderRows("user-1")

    expect(database.state.tables).toStrictEqual(["order"])
    expect(database.state.limits).toStrictEqual([CUSTOMER_ACCOUNT_ORDERS_LIMIT])
  })

  it("honours an explicit limit so a summary can ask for fewer orders", async () => {
    await getCustomerOrderRows("user-1", 3)

    expect(database.state.limits).toStrictEqual([3])
  })
})

describe("getOrderItemsForOrders", () => {
  beforeEach(() => {
    database.state.limits = []
    database.state.rows = []
    database.state.tables = []
  })

  it("never queries for an empty set of orders", () => {
    expect(getOrderItemsForOrders([])).toStrictEqual([])
    expect(database.state.tables).toStrictEqual([])
  })

  it("reads the line items of the orders it was given", async () => {
    database.state.rows = [{ orderId: "order-1", quantity: 2 }]

    await expect(getOrderItemsForOrders(["order-1", "order-2"])).resolves.toStrictEqual([{ orderId: "order-1", quantity: 2 }])
    expect(database.state.tables).toStrictEqual(["order_item"])
  })

  it("does not limit the line items, so no order loses a line", async () => {
    await getOrderItemsForOrders(["order-1"])

    expect(database.state.limits).toStrictEqual([])
  })
})
