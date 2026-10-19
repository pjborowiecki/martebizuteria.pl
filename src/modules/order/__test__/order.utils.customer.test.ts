import { describe, expect, it } from "vite-plus/test"

import { type Order } from "~/src/modules/order/order.types"
import { matchesCustomerAccountOrderFilter, resolveCustomerAccountOrderStatus } from "~/src/modules/order/order.utils"

const FILTER_BUCKET_CASES: [Order["select"]["fulfillmentStatus"], string][] = [
  ["delivered", "delivered"],
  ["shipped", "shipped"],
  ["not_fulfilled", "confirmed"],
  ["fulfilled", "processing"],
]

describe("resolveCustomerAccountOrderStatus", () => {
  it("treats a cancelled order or a cancelled fulfilment as cancelled", () => {
    expect(resolveCustomerAccountOrderStatus("cancelled", "shipped")).toBe("cancelled")
    expect(resolveCustomerAccountOrderStatus("processing", "cancelled")).toBe("cancelled")
  })

  it.each(FILTER_BUCKET_CASES)("maps the fulfilment status %s to the %s bucket", (fulfillmentStatus, expected) => {
    expect(resolveCustomerAccountOrderStatus("processing", fulfillmentStatus)).toBe(expected)
  })

  it("shows a refunded order as refunded whatever step it reached", () => {
    expect(resolveCustomerAccountOrderStatus("refunded", "delivered")).toBe("refunded")
  })

  it("shows an order still awaiting payment as such", () => {
    expect(resolveCustomerAccountOrderStatus("pending", "not_fulfilled")).toBe("pending")
  })
})

describe("matchesCustomerAccountOrderFilter", () => {
  it("keeps every order under the all filter", () => {
    expect(matchesCustomerAccountOrderFilter("all", "cancelled", "cancelled")).toBe(true)
  })

  it("matches only the order's own bucket", () => {
    expect(matchesCustomerAccountOrderFilter("shipped", "processing", "shipped")).toBe(true)
    expect(matchesCustomerAccountOrderFilter("delivered", "processing", "shipped")).toBe(false)
  })
})
