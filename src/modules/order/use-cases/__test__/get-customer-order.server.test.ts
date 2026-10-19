import { describe, expect, it, vi } from "vite-plus/test"

import { mapCustomerOrderDetail } from "~/src/modules/order/use-cases/get-customer-order.server"

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

const paymentRow = {
  provider: "stripe",
  refundedAmount: 0,
  refundedAt: null,
  status: "succeeded" as const,
  updatedAt: new Date(2024, 4, 1, 12, 5),
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

describe("mapCustomerOrderDetail", () => {
  it("adds the money breakdown and the supplied addresses to the summary", () => {
    const detail = mapCustomerOrderDetail(orderRow, [itemRow], { payment: paymentRow })

    expect(detail).toMatchObject({
      discountMinorUnits: 0,
      paymentProvider: "stripe",
      shippingMinorUnits: 1500,
      subtotalMinorUnits: 24_000,
      taxBasisPoints: 2300,
      taxMinorUnits: 0,
    })
  })

  it("counts the pieces an order holds, not just its lines", () => {
    const detail = mapCustomerOrderDetail(orderRow, [itemRow, { ...itemRow, id: "item-2", quantity: 3 }], {})

    expect(detail.itemCount).toBe(5)
  })

  it("derives a unit price for a historical line that stored none", () => {
    const detail = mapCustomerOrderDetail(orderRow, [{ ...itemRow, unitPrice: undefined }], {})

    expect(detail.items[0]?.unitPriceMinorUnits).toBe(12_000)
  })

  it("starts the timeline at the order being placed", () => {
    const detail = mapCustomerOrderDetail({ ...orderRow, status: "pending" }, [itemRow], {})

    expect(detail.timeline).toStrictEqual([{ date: orderRow.createdAt, event: "placed" }])
  })

  it("confirms an order from the payment that went through", () => {
    const detail = mapCustomerOrderDetail(orderRow, [itemRow], { payment: paymentRow })

    expect(detail.timeline.map((entry) => entry.event)).toStrictEqual(["confirmed", "placed"])
  })

  it("leaves an order with no successful payment unconfirmed", () => {
    const detail = mapCustomerOrderDetail(orderRow, [itemRow], { payment: { ...paymentRow, status: "pending" } })

    expect(detail.timeline.map((entry) => entry.event)).toStrictEqual(["placed"])
  })

  it("lists the newest timeline entry first", () => {
    const detail = mapCustomerOrderDetail({ ...orderRow, deliveredAt: new Date(2024, 4, 5), shippedAt: new Date(2024, 4, 3) }, [itemRow], {
      payment: paymentRow,
    })

    expect(detail.timeline.map((entry) => entry.event)).toStrictEqual(["delivered", "shipped", "confirmed", "placed"])
  })

  it("tells the shopper when the atelier started preparing the order", () => {
    const startedAt = new Date(2024, 4, 2)
    const detail = mapCustomerOrderDetail({ ...orderRow, fulfillmentStartedAt: startedAt, fulfillmentStatus: "fulfilled" }, [itemRow], {
      payment: paymentRow,
    })

    expect(detail.timeline[0]).toStrictEqual({ date: startedAt, event: "processing" })
    expect(detail.filterStatus).toBe("processing")
  })

  it("records a cancellation on the timeline", () => {
    const detail = mapCustomerOrderDetail({ ...orderRow, canceledAt: new Date(2024, 4, 2), status: "cancelled" }, [itemRow], {})

    expect(detail.timeline.map((entry) => entry.event)).toContain("cancelled")
    expect(detail.filterStatus).toBe("cancelled")
  })

  it("reports a refund with the date the provider recorded", () => {
    const refundedAt = new Date(2024, 4, 9)
    const detail = mapCustomerOrderDetail(orderRow, [itemRow], { payment: { ...paymentRow, refundedAmount: 5000, refundedAt } })

    expect(detail.refund).toStrictEqual({ amountMinorUnits: 5000, refundedAt })
  })

  it("reports a refund the provider left undated without inventing a date", () => {
    const detail = mapCustomerOrderDetail(orderRow, [itemRow], { payment: { ...paymentRow, refundedAmount: 5000 } })

    expect(detail.refund).toStrictEqual({ amountMinorUnits: 5000, refundedAt: undefined })
  })

  it("shows the parcel locker an order is waiting in, with the address it kept", () => {
    const lockerPoint = JSON.stringify({ city: "Warszawa", description: "Przy Żabce", postalCode: "00-001", street: "Marszałkowska" })
    const detail = mapCustomerOrderDetail({ ...orderRow, lockerId: "WAW01M", lockerPoint }, [itemRow], { deliveryMethodType: "locker" })

    expect(detail.lockerId).toBe("WAW01M")
    expect(detail.lockerPoint).toStrictEqual({ city: "Warszawa", description: "Przy Żabce", postalCode: "00-001", street: "Marszałkowska" })
  })

  it("leaves the locker absent for a locker delivery that recorded no locker", () => {
    const detail = mapCustomerOrderDetail(orderRow, [itemRow], { deliveryMethodType: "locker" })

    expect(detail.lockerId).toBeUndefined()
  })

  it("hides a stale locker once the order goes by courier", () => {
    const detail = mapCustomerOrderDetail({ ...orderRow, lockerId: "WAW01M", lockerPoint: "{}" }, [itemRow], {
      deliveryMethodType: "courier",
    })

    expect(detail.lockerId).toBeUndefined()
    expect(detail.lockerPoint).toBeUndefined()
  })

  it("links a tracking number pasted by hand for an InPost delivery to InPost's tracking page", () => {
    const detail = mapCustomerOrderDetail({ ...orderRow, trackingNumber: "520000011395200025754311" }, [itemRow], {
      deliveryCourierCode: "inpost",
      deliveryMethodType: "locker",
    })

    expect(detail.trackingUrl).toBe("https://inpost.pl/sledzenie-przesylek?number=520000011395200025754311")
  })

  it("normalises the nullable tracking and date columns to absent", () => {
    const detail = mapCustomerOrderDetail(orderRow, [itemRow], {})

    expect(detail.trackingNumber).toBeUndefined()
    expect(detail.trackingUrl).toBeUndefined()
    expect(detail.shippedAt).toBeUndefined()
    expect(detail.deliveredAt).toBeUndefined()
  })
})
