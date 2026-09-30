import { describe, expect, it } from "vite-plus/test"

import { orderZodSchemas } from "~/src/modules/order/order.zod"

const ORDER_UUID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

describe("orderZodSchemas.adminOrderIdInput", () => {
  it("accepts a uuid order id", () => {
    expect(orderZodSchemas.adminOrderIdInput.parse({ orderId: ORDER_UUID })).toStrictEqual({ orderId: ORDER_UUID })
  })

  it("rejects a non uuid order id", () => {
    expect(orderZodSchemas.adminOrderIdInput.safeParse({ orderId: "order-1" }).success).toBe(false)
  })

  it("rejects a missing order id", () => {
    expect(orderZodSchemas.adminOrderIdInput.safeParse({}).success).toBe(false)
  })
})

describe("orderZodSchemas.adminOrdersPageInput", () => {
  it("accepts an empty filter set", () => {
    expect(orderZodSchemas.adminOrdersPageInput.parse({})).toStrictEqual({})
  })

  it("keeps every known filter", () => {
    const input = {
      fulfillment: "shipped",
      page: 2,
      pageSize: 25,
      payment: "paid",
      search: "ada",
      statFilter: "pending",
      status: "processing",
      tab: "unfulfilled",
    }

    expect(orderZodSchemas.adminOrdersPageInput.parse(input)).toStrictEqual(input)
  })

  it("rejects a status outside the order status enum", () => {
    expect(orderZodSchemas.adminOrdersPageInput.safeParse({ status: "archived" }).success).toBe(false)
  })

  it("rejects a tab outside the order tab enum", () => {
    expect(orderZodSchemas.adminOrdersPageInput.safeParse({ tab: "refunded" }).success).toBe(false)
  })

  it("rejects a payment key outside the payment ui enum", () => {
    expect(orderZodSchemas.adminOrdersPageInput.safeParse({ payment: "pending" }).success).toBe(false)
  })

  it("rejects a page below the first page", () => {
    expect(orderZodSchemas.adminOrdersPageInput.safeParse({ page: 0 }).success).toBe(false)
  })

  it("rejects a fractional page", () => {
    expect(orderZodSchemas.adminOrdersPageInput.safeParse({ page: 1.5 }).success).toBe(false)
  })

  it("rejects a page size below one", () => {
    expect(orderZodSchemas.adminOrdersPageInput.safeParse({ pageSize: 0 }).success).toBe(false)
  })
})

describe("orderZodSchemas column filters", () => {
  it("accepts a numeric total filter with an amount", () => {
    const total = { amountMinorUnits: 5000, operator: "gte" }

    expect(orderZodSchemas.adminOrdersPageInput.parse({ total })).toStrictEqual({ total })
  })

  it("rejects a between total filter without both bounds", () => {
    expect(orderZodSchemas.adminOrdersPageInput.safeParse({ total: { operator: "between", startAmountMinorUnits: 1 } }).success).toBe(false)
  })

  it("rejects a total filter with an unknown operator", () => {
    expect(orderZodSchemas.adminOrdersPageInput.safeParse({ total: { amountMinorUnits: 1, operator: "approx" } }).success).toBe(false)
  })

  it("accepts a created at filter with an iso date", () => {
    const createdAt = { date: "2026-01-15", operator: "on" }

    expect(orderZodSchemas.adminOrdersPageInput.parse({ createdAt })).toStrictEqual({ createdAt })
  })

  it("rejects a created at filter with a malformed date", () => {
    expect(orderZodSchemas.adminOrdersPageInput.safeParse({ createdAt: { date: "15/01/2026", operator: "on" } }).success).toBe(false)
  })
})

describe("orderZodSchemas.adminOrdersExportInput", () => {
  it("has no pagination fields", () => {
    expect(orderZodSchemas.adminOrdersExportInput.parse({ page: 2, pageSize: 50, tab: "all" })).toStrictEqual({ tab: "all" })
  })
})

describe("orderZodSchemas table schemas", () => {
  it("requires the email on an insert", () => {
    expect(orderZodSchemas.insert.safeParse({ total: 1000 }).success).toBe(false)
  })

  it("accepts an insert carrying only the required email", () => {
    expect(orderZodSchemas.insert.safeParse({ email: "ada@example.test" }).success).toBe(true)
  })

  it("rejects a status outside the schema enum on an update", () => {
    expect(orderZodSchemas.update.safeParse({ status: "archived" }).success).toBe(false)
  })

  it("accepts a partial update", () => {
    expect(orderZodSchemas.update.safeParse({ status: "refunded" }).success).toBe(true)
  })

  it("requires the generated columns on a select row", () => {
    expect(orderZodSchemas.select.safeParse({ email: "ada@example.test" }).success).toBe(false)
  })
})
