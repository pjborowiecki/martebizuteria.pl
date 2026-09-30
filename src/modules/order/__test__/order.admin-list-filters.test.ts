import { describe, expect, it } from "vite-plus/test"

import { DATE_COLUMN_FILTER_OPERATOR, NUMERIC_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"
import { parseAdminOrdersListFilters } from "~/src/modules/order/order.admin-list-filters"

const numeric = { amountMinorUnits: 10_000, operator: NUMERIC_COLUMN_FILTER_OPERATOR.LTE }

const dateFilter = { date: "2024-06-01", operator: DATE_COLUMN_FILTER_OPERATOR.BEFORE }

describe("parseAdminOrdersListFilters", () => {
  it("is empty when the table has no filters", () => {
    expect(parseAdminOrdersListFilters([])).toStrictEqual({})
  })

  it("ignores a column the server cannot filter on", () => {
    expect(parseAdminOrdersListFilters([{ id: "customer", value: "anna" }])).toStrictEqual({})
  })

  it.each([["pending"], ["processing"], ["completed"], ["cancelled"], ["refunded"]])("accepts the order status %s", (status) => {
    expect(parseAdminOrdersListFilters([{ id: "status", value: status }])).toStrictEqual({ status })
  })

  it("rejects an order status the enum does not know", () => {
    expect(parseAdminOrdersListFilters([{ id: "status", value: "archived" }])).toStrictEqual({})
  })

  it.each([["authorized"], ["paid"], ["refunded"]])("accepts the payment key %s", (payment) => {
    expect(parseAdminOrdersListFilters([{ id: "payment", value: payment }])).toStrictEqual({ payment })
  })

  it.each([["pending"], ["unfulfilled"], ["shipped"], ["delivered"], ["returned"]])("accepts the fulfilment key %s", (fulfillment) => {
    expect(parseAdminOrdersListFilters([{ id: "fulfillment", value: fulfillment }])).toStrictEqual({ fulfillment })
  })

  it("rejects unknown payment and fulfilment keys", () => {
    expect(parseAdminOrdersListFilters([{ id: "payment", value: "chargeback" }])).toStrictEqual({})
    expect(parseAdminOrdersListFilters([{ id: "fulfillment", value: "lost" }])).toStrictEqual({})
  })

  it("accepts a well formed total filter only", () => {
    expect(parseAdminOrdersListFilters([{ id: "total", value: numeric }])).toStrictEqual({ total: numeric })
    expect(parseAdminOrdersListFilters([{ id: "total", value: { operator: "lte" } }])).toStrictEqual({})
  })

  it("accepts a well formed created-at filter only", () => {
    expect(parseAdminOrdersListFilters([{ id: "createdAt", value: dateFilter }])).toStrictEqual({ createdAt: dateFilter })
    expect(parseAdminOrdersListFilters([{ id: "createdAt", value: { date: "nope", operator: "on" } }])).toStrictEqual({})
  })

  it("collects several filters at once", () => {
    expect(
      parseAdminOrdersListFilters([
        { id: "status", value: "processing" },
        { id: "payment", value: "paid" },
        { id: "total", value: numeric },
      ]),
    ).toStrictEqual({ payment: "paid", status: "processing", total: numeric })
  })
})
