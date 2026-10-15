import { describe, expect, it } from "vite-plus/test"

import {
  canCancelAdminOrder,
  canCreateAdminOrderInpostShipment,
  canFulfillAdminOrder,
  canMarkAdminOrderShipped,
  canPrintAdminOrderSummary,
  canRefundAdminOrder,
  canRestockAdminOrder,
  canSetAdminOrderTrackingNumber,
  cancelRefundsAdminOrderPayment,
  isInpostDeliveryType,
  refundRestocksByDefault,
  resolveAdminOrderCancelBlocker,
  resolveAdminOrderRefundBlocker,
  resolveAdminOrderStepBack,
} from "~/src/modules/order/order.admin-actions.utils"
import { ADMIN_ORDER_CANCEL_BLOCKER, ADMIN_ORDER_REFUND_BLOCKER, type AdminOrderPaymentUiKey } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

type FulfillmentStatus = Order["select"]["fulfillmentStatus"]

type OrderStatus = Order["select"]["status"]

const FULFILLABLE: FulfillmentStatus[] = ["not_fulfilled", "partially_fulfilled"]

const ALREADY_FULFILLED: FulfillmentStatus[] = ["fulfilled", "shipped", "delivered", "cancelled"]

const SHIPPABLE: FulfillmentStatus[] = ["fulfilled", "partially_fulfilled"]

const TERMINAL: FulfillmentStatus[] = ["shipped", "delivered", "cancelled"]

const STILL_IN_THE_SHOP: FulfillmentStatus[] = ["not_fulfilled", "partially_fulfilled", "fulfilled"]

const DISPATCHED: FulfillmentStatus[] = ["shipped", "delivered"]

const CLOSED_STATUSES: OrderStatus[] = ["cancelled", "refunded"]

const OPEN_STATUSES: OrderStatus[] = ["pending", "processing"]

const FINAL_STATUSES: OrderStatus[] = ["completed", "cancelled", "refunded"]

const SUMMARY_PRINTABLE_STATUSES: OrderStatus[] = ["pending", "processing", "completed", "refunded"]

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

describe("resolveAdminOrderStepBack", () => {
  it.each<[FulfillmentStatus, OrderStatus, Order["stepBack"]]>([
    ["fulfilled", "processing", { from: "processing", to: "confirmed" }],
    ["shipped", "processing", { from: "shipped", to: "processing" }],
    ["delivered", "completed", { from: "delivered", to: "shipped" }],
  ])("steps a %s %s order back", (fulfillmentStatus, status, stepBack) => {
    expect(resolveAdminOrderStepBack({ fulfillmentStatus, status })).toStrictEqual(stepBack)
  })

  it.each<FulfillmentStatus>(["not_fulfilled", "partially_fulfilled", "cancelled"])(
    "has no earlier step for a %s order",
    (fulfillmentStatus) => {
      expect(resolveAdminOrderStepBack({ fulfillmentStatus, status: "processing" })).toBeUndefined()
    },
  )

  it.each(CLOSED_STATUSES)("never steps a %s order back", (status) => {
    expect(resolveAdminOrderStepBack({ fulfillmentStatus: "delivered", status })).toBeUndefined()
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

describe("canSetAdminOrderTrackingNumber", () => {
  it("allows a tracking number for an order on its way to the customer", () => {
    expect(canSetAdminOrderTrackingNumber({ fulfillmentStatus: "shipped", status: "processing" })).toBe(true)
  })

  it.each<FulfillmentStatus>([...STILL_IN_THE_SHOP, "delivered", "cancelled"])(
    "refuses a tracking number for an order that is %s",
    (fulfillmentStatus) => {
      expect(canSetAdminOrderTrackingNumber({ fulfillmentStatus, status: "processing" })).toBe(false)
    },
  )

  it.each(CLOSED_STATUSES)("refuses a tracking number for a %s order", (status) => {
    expect(canSetAdminOrderTrackingNumber({ fulfillmentStatus: "shipped", status })).toBe(false)
  })
})

describe("canCancelAdminOrder", () => {
  it.each(OPEN_STATUSES)("allows cancelling an open %s order", (status) => {
    expect(canCancelAdminOrder({ fulfillmentStatus: "not_fulfilled", status })).toBe(true)
  })

  it.each(FINAL_STATUSES)("refuses to cancel a closed %s order", (status) => {
    expect(canCancelAdminOrder({ fulfillmentStatus: "not_fulfilled", status })).toBe(false)
  })

  it.each(STILL_IN_THE_SHOP)("allows cancelling an order whose parcel is still %s in the shop", (fulfillmentStatus) => {
    expect(canCancelAdminOrder({ fulfillmentStatus, status: "processing" })).toBe(true)
  })

  it.each(DISPATCHED)("refuses to cancel an order that was already %s", (fulfillmentStatus) => {
    expect(canCancelAdminOrder({ fulfillmentStatus, status: "processing" })).toBe(false)
  })
})

describe("cancelRefundsAdminOrderPayment", () => {
  it("refunds the payment of a paid order that cost something", () => {
    expect(cancelRefundsAdminOrderPayment({ paymentUiKey: "paid", totalMinorUnits: 12_900 })).toBe(true)
  })

  it("has nothing to refund for a free order", () => {
    expect(cancelRefundsAdminOrderPayment({ paymentUiKey: "paid", totalMinorUnits: 0 })).toBe(false)
  })

  it.each<AdminOrderPaymentUiKey>(["authorized", "refunded"])("has nothing to refund when the payment is %s", (paymentUiKey) => {
    expect(cancelRefundsAdminOrderPayment({ paymentUiKey, totalMinorUnits: 12_900 })).toBe(false)
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

describe("refundRestocksByDefault", () => {
  it.each(STILL_IN_THE_SHOP)("expects the goods of an order that is still %s in the shop back in stock", (fulfillmentStatus) => {
    expect(refundRestocksByDefault({ fulfillmentStatus })).toBe(true)
  })

  it.each(DISPATCHED)("expects nothing back in stock from an order that was %s until the admin says so", (fulfillmentStatus) => {
    expect(refundRestocksByDefault({ fulfillmentStatus })).toBe(false)
  })
})

describe("canRestockAdminOrder", () => {
  it("offers to return the items of a refunded order whose stock never went back", () => {
    expect(canRestockAdminOrder({ restockedAt: undefined, status: "refunded" })).toBe(true)
  })

  it("refuses to return the items of a refunded order a second time", () => {
    expect(canRestockAdminOrder({ restockedAt: new Date("2026-10-05T10:00:00.000Z"), status: "refunded" })).toBe(false)
  })

  it.each<OrderStatus>(["pending", "processing", "completed", "cancelled"])("refuses to return the items of a %s order", (status) => {
    expect(canRestockAdminOrder({ restockedAt: undefined, status })).toBe(false)
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

describe("resolveAdminOrderCancelBlocker", () => {
  it("blocks cancelling a paid order while its dispute is open, since the cancellation would refund it", () => {
    expect(resolveAdminOrderCancelBlocker({ hasOpenDispute: true, paymentUiKey: "paid", totalMinorUnits: 12_900 })).toBe(
      ADMIN_ORDER_CANCEL_BLOCKER.OPEN_DISPUTE,
    )
  })

  it("lets a paid order without a dispute be cancelled", () => {
    expect(resolveAdminOrderCancelBlocker({ hasOpenDispute: false, paymentUiKey: "paid", totalMinorUnits: 12_900 })).toBeUndefined()
  })

  it("lets a disputed order be cancelled when the cancellation refunds nothing", () => {
    expect(resolveAdminOrderCancelBlocker({ hasOpenDispute: true, paymentUiKey: "paid", totalMinorUnits: 0 })).toBeUndefined()
    expect(resolveAdminOrderCancelBlocker({ hasOpenDispute: true, paymentUiKey: "authorized", totalMinorUnits: 12_900 })).toBeUndefined()
  })
})

describe("canPrintAdminOrderSummary", () => {
  it.each(SUMMARY_PRINTABLE_STATUSES)("allows printing the summary of a %s order", (status) => {
    expect(canPrintAdminOrderSummary({ status })).toBe(true)
  })

  it("refuses to print the summary of a cancelled order", () => {
    expect(canPrintAdminOrderSummary({ status: "cancelled" })).toBe(false)
  })
})

describe("isInpostDeliveryType", () => {
  it.each(["courier", "locker"] as const)("hands a %s delivery to InPost", (deliveryType) => {
    expect(isInpostDeliveryType(deliveryType)).toBe(true)
  })

  it.each(["in_store", undefined] as const)("keeps a %s delivery away from InPost", (deliveryType) => {
    expect(isInpostDeliveryType(deliveryType)).toBe(false)
  })
})

describe("canCreateAdminOrderInpostShipment", () => {
  const shippable = {
    deliveryType: "locker" as const,
    fulfillmentStatus: "fulfilled" as const,
    inpostShipmentId: undefined,
    inpostShipmentStatus: undefined,
    status: "processing" as const,
  }

  it.each(STILL_IN_THE_SHOP)("books a shipment for an open %s locker order", (fulfillmentStatus) => {
    expect(canCreateAdminOrderInpostShipment({ ...shippable, fulfillmentStatus })).toBe(true)
  })

  it("books a shipment for a pending courier order", () => {
    expect(canCreateAdminOrderInpostShipment({ ...shippable, deliveryType: "courier", status: "pending" })).toBe(true)
  })

  it.each(["created", "confirmed", undefined])("books no second shipment while the order holds one InPost reports as %s", (status) => {
    expect(canCreateAdminOrderInpostShipment({ ...shippable, inpostShipmentId: "49", inpostShipmentStatus: status })).toBe(false)
  })

  it("books a new shipment once InPost reports the order's shipment cancelled", () => {
    expect(canCreateAdminOrderInpostShipment({ ...shippable, inpostShipmentId: "49", inpostShipmentStatus: "canceled" })).toBe(true)
  })

  it("books no replacement for a cancelled shipment once the order has shipped", () => {
    expect(
      canCreateAdminOrderInpostShipment({
        ...shippable,
        fulfillmentStatus: "shipped",
        inpostShipmentId: "49",
        inpostShipmentStatus: "canceled",
      }),
    ).toBe(false)
  })

  it.each(["in_store", undefined] as const)("books no InPost shipment for a %s delivery", (deliveryType) => {
    expect(canCreateAdminOrderInpostShipment({ ...shippable, deliveryType })).toBe(false)
  })

  it.each(["completed", "cancelled", "refunded"] as const)("books no shipment for a %s order", (status) => {
    expect(canCreateAdminOrderInpostShipment({ ...shippable, status })).toBe(false)
  })

  it.each(["shipped", "delivered"] as const)("books no shipment for an order already %s", (fulfillmentStatus) => {
    expect(canCreateAdminOrderInpostShipment({ ...shippable, fulfillmentStatus })).toBe(false)
  })
})
