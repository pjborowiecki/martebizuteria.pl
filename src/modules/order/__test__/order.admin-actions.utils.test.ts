import { describe, expect, it } from "vite-plus/test"

import {
  canCancelAdminOrder,
  canFulfillAdminOrder,
  canMarkAdminOrderShipped,
  canPrintAdminOrderInvoice,
  canRefundAdminOrder,
  resolveAdminOrderRefundBlocker,
} from "~/src/modules/order/order.admin-actions.utils"
import { ADMIN_ORDER_REFUND_BLOCKER, type AdminOrderPaymentUiKey } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

type FulfillmentStatus = Order["select"]["fulfillmentStatus"]

type OrderStatus = Order["select"]["status"]

const FULFILLABLE: FulfillmentStatus[] = ["not_fulfilled", "partially_fulfilled"]

const ALREADY_FULFILLED: FulfillmentStatus[] = ["fulfilled", "shipped", "delivered", "cancelled"]

const SHIPPABLE: FulfillmentStatus[] = ["fulfilled", "partially_fulfilled"]

const TERMINAL: FulfillmentStatus[] = ["shipped", "delivered", "cancelled"]

const CLOSED_STATUSES: OrderStatus[] = ["cancelled", "refunded"]

const OPEN_STATUSES: OrderStatus[] = ["pending", "processing"]

const FINAL_STATUSES: OrderStatus[] = ["completed", "cancelled", "refunded"]

const INVOICEABLE_STATUSES: OrderStatus[] = ["pending", "processing", "completed", "refunded"]

describe("canFulfillAdminOrder", () => {
  it.each(FULFILLABLE)("allows fulfilling an order that is %s", (fulfillmentStatus) => {
    expect(canFulfillAdminOrder({ fulfillmentStatus, paymentUiKey: "paid", status: "processing" })).toBe(true)
  })

  it.each(ALREADY_FULFILLED)("refuses to fulfil an order that is already %s", (fulfillmentStatus) => {
    expect(canFulfillAdminOrder({ fulfillmentStatus, paymentUiKey: "paid", status: "processing" })).toBe(false)
  })

  it.each(CLOSED_STATUSES)("refuses to fulfil a %s order whatever its fulfilment state", (status) => {
    expect(canFulfillAdminOrder({ fulfillmentStatus: "not_fulfilled", paymentUiKey: "paid", status })).toBe(false)
  })
})

describe("canMarkAdminOrderShipped", () => {
  it.each(SHIPPABLE)("allows shipping an order that is %s", (fulfillmentStatus) => {
    expect(canMarkAdminOrderShipped({ fulfillmentStatus, paymentUiKey: "paid", status: "processing" })).toBe(true)
  })

  it.each(TERMINAL)("refuses to ship an order that already reached %s", (fulfillmentStatus) => {
    expect(canMarkAdminOrderShipped({ fulfillmentStatus, paymentUiKey: "paid", status: "processing" })).toBe(false)
  })

  it("refuses to ship nothing that has not been picked yet", () => {
    expect(canMarkAdminOrderShipped({ fulfillmentStatus: "not_fulfilled", paymentUiKey: "paid", status: "processing" })).toBe(false)
  })

  it.each(CLOSED_STATUSES)("refuses to ship a %s order", (status) => {
    expect(canMarkAdminOrderShipped({ fulfillmentStatus: "fulfilled", paymentUiKey: "paid", status })).toBe(false)
  })
})

describe("canCancelAdminOrder", () => {
  it.each(OPEN_STATUSES)("allows cancelling an open %s order", (status) => {
    expect(canCancelAdminOrder({ status })).toBe(true)
  })

  it.each(FINAL_STATUSES)("refuses to cancel a closed %s order", (status) => {
    expect(canCancelAdminOrder({ status })).toBe(false)
  })
})

describe("canRefundAdminOrder", () => {
  it("allows refunding a paid order that is still open", () => {
    expect(canRefundAdminOrder({ paymentUiKey: "paid", status: "processing" })).toBe(true)
    expect(canRefundAdminOrder({ paymentUiKey: "paid", status: "completed" })).toBe(true)
  })

  it.each<AdminOrderPaymentUiKey>(["authorized", "refunded"])("refuses to refund an order whose payment is %s", (paymentUiKey) => {
    expect(canRefundAdminOrder({ paymentUiKey, status: "processing" })).toBe(false)
  })

  it.each(CLOSED_STATUSES)("refuses to refund a %s order twice", (status) => {
    expect(canRefundAdminOrder({ paymentUiKey: "paid", status })).toBe(false)
  })
})

describe("resolveAdminOrderRefundBlocker", () => {
  it("lets Stripe refund a paid order without a dispute", () => {
    expect(resolveAdminOrderRefundBlocker({ hasOpenDispute: false, totalMinorUnits: 12_900 })).toBeUndefined()
  })

  it("blocks a free order, which Stripe never charged", () => {
    expect(resolveAdminOrderRefundBlocker({ hasOpenDispute: false, totalMinorUnits: 0 })).toBe(ADMIN_ORDER_REFUND_BLOCKER.NO_STRIPE_PAYMENT)
  })

  it("blocks an order while its dispute is open", () => {
    expect(resolveAdminOrderRefundBlocker({ hasOpenDispute: true, totalMinorUnits: 12_900 })).toBe(ADMIN_ORDER_REFUND_BLOCKER.OPEN_DISPUTE)
  })
})

describe("canPrintAdminOrderInvoice", () => {
  it.each(INVOICEABLE_STATUSES)("allows printing an invoice for a %s order", (status) => {
    expect(canPrintAdminOrderInvoice({ status })).toBe(true)
  })

  it("refuses to print an invoice for a cancelled order", () => {
    expect(canPrintAdminOrderInvoice({ status: "cancelled" })).toBe(false)
  })
})
