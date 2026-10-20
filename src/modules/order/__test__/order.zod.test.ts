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

describe("orderZodSchemas.adminRefundOrderInput", () => {
  it.each([true, false])("keeps the admin's answer to whether the items came back to stock (%s)", (restock) => {
    expect(orderZodSchemas.adminRefundOrderInput.parse({ orderId: ORDER_UUID, restock })).toStrictEqual({ orderId: ORDER_UUID, restock })
  })

  it("refuses a refund that does not say whether the items came back to stock", () => {
    expect(orderZodSchemas.adminRefundOrderInput.safeParse({ orderId: ORDER_UUID }).success).toBe(false)
  })

  it("refuses a refund of an order id that is not a uuid", () => {
    expect(orderZodSchemas.adminRefundOrderInput.safeParse({ orderId: "order-1", restock: false }).success).toBe(false)
  })
})

describe("orderZodSchemas.adminCreateInpostShipmentInput", () => {
  it("keeps the parcel size and the courier weight the admin chose", () => {
    expect(
      orderZodSchemas.adminCreateInpostShipmentInput.parse({ orderId: ORDER_UUID, parcelTemplate: "medium", weightKg: 0.4 }),
    ).toStrictEqual({ orderId: ORDER_UUID, parcelTemplate: "medium", weightKg: 0.4 })
  })

  it("accepts a locker parcel without a weight", () => {
    expect(orderZodSchemas.adminCreateInpostShipmentInput.parse({ orderId: ORDER_UUID, parcelTemplate: "small" })).toStrictEqual({
      orderId: ORDER_UUID,
      parcelTemplate: "small",
    })
  })

  it.each([0, -1, 25.01])("refuses a weight of %s kg", (weightKg) => {
    expect(
      orderZodSchemas.adminCreateInpostShipmentInput.safeParse({ orderId: ORDER_UUID, parcelTemplate: "small", weightKg }).success,
    ).toBe(false)
  })

  it("refuses a parcel size InPost does not offer", () => {
    expect(orderZodSchemas.adminCreateInpostShipmentInput.safeParse({ orderId: ORDER_UUID, parcelTemplate: "xlarge" }).success).toBe(false)
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

  it("keeps the customer a page is scoped to", () => {
    expect(orderZodSchemas.adminOrdersPageInput.parse({ page: 1, userId: "u-anna" })).toStrictEqual({ page: 1, userId: "u-anna" })
  })

  it("rejects a blank customer scope", () => {
    expect(orderZodSchemas.adminOrdersPageInput.safeParse({ userId: "  " }).success).toBe(false)
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
