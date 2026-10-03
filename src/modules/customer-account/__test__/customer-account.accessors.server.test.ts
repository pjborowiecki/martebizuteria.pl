import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  countCustomerOrders,
  getCustomerActivityAuditRows,
  getCustomerOrderRows,
  getCustomerSpendStats,
  getOrderItemsForOrders,
} from "~/src/modules/customer-account/customer-account.accessors.server"
import { CUSTOMER_ACCOUNT_ORDERS_LIMIT } from "~/src/modules/customer-account/customer-account.constants"
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

describe("getCustomerOrderRows", () => {
  beforeEach(() => {
    database.state.joins = 0
    database.state.limits = []
    database.state.offsets = []
    database.state.rows = []
    database.state.tables = []
  })

  it("reads the order table with the account page's default limit and no offset", async () => {
    await getCustomerOrderRows("user-1")

    expect(database.state.tables).toStrictEqual(["order"])
    expect(database.state.limits).toStrictEqual([CUSTOMER_ACCOUNT_ORDERS_LIMIT])
    expect(database.state.offsets).toStrictEqual([0])
  })

  it("honours an explicit limit so a summary can ask for fewer orders", async () => {
    await getCustomerOrderRows("user-1", { limit: 3 })

    expect(database.state.limits).toStrictEqual([3])
  })

  it("skips the orders already shown when a later page is asked for", async () => {
    await getCustomerOrderRows("user-1", { limit: 10, offset: 20 })

    expect(database.state.offsets).toStrictEqual([20])
  })
})

describe("countCustomerOrders", () => {
  beforeEach(() => {
    database.state.joins = 0
    database.state.limits = []
    database.state.offsets = []
    database.state.rows = []
    database.state.tables = []
  })

  it("counts every order the filter matches, not just the page on screen", async () => {
    database.state.rows = [{ total: 37 }]

    await expect(countCustomerOrders("user-1")).resolves.toBe(37)
    expect(database.state.tables).toStrictEqual(["order"])
    expect(database.state.limits).toStrictEqual([])
  })

  it("reports no orders when the count comes back empty", async () => {
    await expect(countCustomerOrders("user-1", "cancelled")).resolves.toBe(0)
  })
})

describe("getCustomerSpendStats", () => {
  beforeEach(() => {
    database.state.joins = 0
    database.state.limits = []
    database.state.offsets = []
    database.state.rows = []
    database.state.tables = []
  })

  it("reads the spend from the order table in one aggregate", async () => {
    database.state.rows = [{ orderCount: 3, totalSpent: 45_000 }]

    await expect(getCustomerSpendStats("user-1")).resolves.toStrictEqual({ orderCount: 3, totalSpent: 45_000 })
    expect(database.state.tables).toStrictEqual(["order"])
  })

  it("reports nothing spent when the aggregate comes back empty", async () => {
    await expect(getCustomerSpendStats("user-1")).resolves.toStrictEqual({ orderCount: 0, totalSpent: 0 })
  })
})

describe("getOrderItemsForOrders", () => {
  beforeEach(() => {
    database.state.joins = 0
    database.state.limits = []
    database.state.offsets = []
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

  it("joins the variant and the product behind each line so a stored line can still show its picture", async () => {
    await getOrderItemsForOrders(["order-1"])

    expect(database.state.joins).toBe(2)
  })

  it("does not limit the line items, so no order loses a line", async () => {
    await getOrderItemsForOrders(["order-1"])

    expect(database.state.limits).toStrictEqual([])
  })
})
