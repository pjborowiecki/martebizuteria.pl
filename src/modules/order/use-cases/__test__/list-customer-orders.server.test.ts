import { describe, expect, it, vi } from "vite-plus/test"

import { mapCustomerOrderSummaryRow } from "~/src/modules/order/use-cases/list-customer-orders.server"

vi.mock("~/src/lib/image", () => ({ getProductImageUrl: (src?: string | null) => src ?? "placeholder.svg" }))

const ORDER_ID = "0195b6f4-1111-7000-8000-000000000001"

const itemRow = {
  handle: "silver-ring",
  id: "item-1",
  orderId: ORDER_ID,
  quantity: 2,
  thumbnail: "products/ring.jpg",
  title: "Silver ring",
  total: 24_000,
  unitPrice: 12_000,
  variantTitle: "Size S",
}

const orderRow = {
  billingCompanyName: null,
  billingNip: null,
  canceledAt: null,
  createdAt: new Date(2024, 4, 1),
  currencyCode: "PLN",
  customerNote: null,
  deliveredAt: null,
  discountTotal: 0,
  fulfillmentStartedAt: null,
  fulfillmentStatus: "not_fulfilled" as const,
  id: ORDER_ID,
  lockerId: null,
  lockerPoint: null,
  orderNumber: "MRT-2026-00001",
  shippedAt: null,
  shippingTotal: 1500,
  status: "processing" as const,
  subtotal: 24_000,
  taxBasisPoints: 2300,
  taxTotal: 0,
  total: 25_500,
  trackingNumber: null,
  trackingUrl: null,
}

describe("mapCustomerOrderSummaryRow", () => {
  it("maps the order and its lines into the summary shape", () => {
    const summary = mapCustomerOrderSummaryRow(orderRow, [itemRow])

    expect(summary).toMatchObject({ filterStatus: "confirmed", id: ORDER_ID, totalMinorUnits: 25_500 })
    expect(summary.items).toStrictEqual([
      {
        handle: "silver-ring",
        id: "item-1",
        image: "products/ring.jpg",
        lineTotalMinorUnits: 24_000,
        name: "Silver ring",
        qty: 2,
        unitPriceMinorUnits: 12_000,
        variantTitle: "Size S",
      },
    ])
  })

  it.each([[null], [""]])("leaves the line image absent when the thumbnail is %j", (thumbnail) => {
    const [item] = mapCustomerOrderSummaryRow(orderRow, [{ ...itemRow, thumbnail }]).items

    expect(item?.image).toBeUndefined()
  })

  it("leaves the variant title absent for a single-variant product", () => {
    const [item] = mapCustomerOrderSummaryRow(orderRow, [{ ...itemRow, variantTitle: null }]).items

    expect(item?.variantTitle).toBeUndefined()
  })
})
