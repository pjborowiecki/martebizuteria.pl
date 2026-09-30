import { describe, expect, it } from "vite-plus/test"

import { ADMIN_ORDER_FULFILLMENT_UI_KEY, ADMIN_ORDER_PAYMENT_UI_KEY } from "~/src/modules/order/order.constants"
import {
  clearDisputeMetadata,
  formatAdminOrderDate,
  mergeDisputeMetadata,
  parseOrderMetadata,
  resolveAdminOrderFulfillmentUiKey,
  resolveAdminOrderPaymentUiKey,
  resolveOrderLocale,
  toAdminOrderListItem,
} from "~/src/modules/order/order.display.utils"
import { type Order } from "~/src/modules/order/order.types"

const dispute = { amount: 12_000, id: "dp_1", reason: "fraudulent", status: "needs_response" }

const FULFILMENT_UI_CASES: [Order["select"]["fulfillmentStatus"], string][] = [
  ["shipped", ADMIN_ORDER_FULFILLMENT_UI_KEY.SHIPPED],
  ["delivered", ADMIN_ORDER_FULFILLMENT_UI_KEY.DELIVERED],
  ["cancelled", ADMIN_ORDER_FULFILLMENT_UI_KEY.RETURNED],
  ["not_fulfilled", ADMIN_ORDER_FULFILLMENT_UI_KEY.UNFULFILLED],
  ["fulfilled", ADMIN_ORDER_FULFILLMENT_UI_KEY.UNFULFILLED],
]

describe("parseOrderMetadata", () => {
  it.each([[null], [undefined], [""]])("reads %j as no metadata", (raw) => {
    expect(parseOrderMetadata(raw)).toStrictEqual({})
  })

  it("reads a stored JSON object", () => {
    expect(parseOrderMetadata('{"locale":"en-US"}')).toStrictEqual({ locale: "en-US" })
  })

  it.each([["{not json"], ['["en-US"]'], ['"en-US"']])("recovers from the unusable metadata %j", (raw) => {
    expect(parseOrderMetadata(raw)).toStrictEqual({})
  })
})

describe("resolveOrderLocale", () => {
  it("uses the locale captured at checkout", () => {
    expect(resolveOrderLocale('{"locale":"en-US"}')).toBe("en-US")
  })

  it.each([[null], ['{"locale":"de-DE"}'], ['{"locale":7}'], ["{}"]])("falls back to the store locale for %j", (metadata) => {
    expect(resolveOrderLocale(metadata)).toBe("pl-PL")
  })
})

describe("dispute metadata", () => {
  it("attaches the dispute without losing the existing metadata", () => {
    expect(JSON.parse(mergeDisputeMetadata('{"locale":"en-US"}', dispute))).toStrictEqual({ dispute, locale: "en-US" })
  })

  it("replaces a dispute that was already recorded", () => {
    const updated = mergeDisputeMetadata(mergeDisputeMetadata(null, dispute), { ...dispute, status: "won" })

    expect(JSON.parse(updated)).toStrictEqual({ dispute: { ...dispute, status: "won" } })
  })

  it("removes only the dispute when it closes", () => {
    const cleared = clearDisputeMetadata(mergeDisputeMetadata('{"locale":"en-US"}', dispute))

    expect(JSON.parse(cleared)).toStrictEqual({ locale: "en-US" })
  })

  it("leaves an order with no dispute untouched", () => {
    expect(JSON.parse(clearDisputeMetadata('{"locale":"en-US"}'))).toStrictEqual({ locale: "en-US" })
    expect(clearDisputeMetadata(null)).toBe("{}")
  })

  it("keeps the order locale resolvable after a dispute round trip", () => {
    const cleared = clearDisputeMetadata(mergeDisputeMetadata('{"locale":"en-US"}', dispute))

    expect(resolveOrderLocale(cleared)).toBe("en-US")
  })
})

describe("resolveAdminOrderPaymentUiKey", () => {
  it.each([
    ["succeeded", ADMIN_ORDER_PAYMENT_UI_KEY.PAID],
    ["refunded", ADMIN_ORDER_PAYMENT_UI_KEY.REFUNDED],
    ["pending", ADMIN_ORDER_PAYMENT_UI_KEY.AUTHORIZED],
    ["failed", ADMIN_ORDER_PAYMENT_UI_KEY.AUTHORIZED],
  ])("shows the payment status %s as %s", (paymentStatus, expected) => {
    expect(resolveAdminOrderPaymentUiKey(paymentStatus)).toBe(expected)
  })

  it.each([[null], [undefined]])("shows a missing payment row as authorized for %j", (paymentStatus) => {
    expect(resolveAdminOrderPaymentUiKey(paymentStatus)).toBe(ADMIN_ORDER_PAYMENT_UI_KEY.AUTHORIZED)
  })
})

describe("resolveAdminOrderFulfillmentUiKey", () => {
  it("shows a pending order as pending regardless of its fulfilment state", () => {
    expect(resolveAdminOrderFulfillmentUiKey("pending", "shipped")).toBe(ADMIN_ORDER_FULFILLMENT_UI_KEY.PENDING)
  })

  it.each(FULFILMENT_UI_CASES)("shows the fulfilment status %s of a processing order as %s", (fulfillmentStatus, expected) => {
    expect(resolveAdminOrderFulfillmentUiKey("processing", fulfillmentStatus)).toBe(expected)
  })
})

describe("formatAdminOrderDate", () => {
  it("formats in the requested locale", () => {
    expect(formatAdminOrderDate(new Date(2024, 5, 15), "en-US")).toBe("Jun 15, 2024")
  })

  it("accepts a stored date string and defaults to the store locale", () => {
    expect(formatAdminOrderDate(new Date(2024, 5, 15).toISOString())).toContain("2024")
  })
})

describe("toAdminOrderListItem", () => {
  const row = {
    createdAt: new Date(2024, 5, 15),
    currencyCode: "PLN",
    customerName: "Anna Kowalska",
    email: "anna@example.com",
    fulfillmentStatus: "not_fulfilled" as const,
    id: "order-1",
    itemCount: 3,
    paymentStatus: "succeeded",
    status: "processing" as const,
    total: 30_000,
    userId: "user-1",
  }

  it("carries the row through with the derived display fields", () => {
    expect(toAdminOrderListItem(row)).toStrictEqual({
      createdAt: row.createdAt,
      currencyCode: "PLN",
      customerName: "Anna Kowalska",
      email: "anna@example.com",
      fulfillmentStatus: "not_fulfilled",
      fulfillmentUiKey: ADMIN_ORDER_FULFILLMENT_UI_KEY.UNFULFILLED,
      id: "order-1",
      initials: "AK",
      itemCount: 3,
      paymentUiKey: ADMIN_ORDER_PAYMENT_UI_KEY.PAID,
      status: "processing",
      totalMinorUnits: 30_000,
      userId: "user-1",
    })
  })

  it("falls back to the email for a guest order with no name", () => {
    const item = toAdminOrderListItem({ ...row, customerName: null })

    expect(item.customerName).toBe("anna@example.com")
    expect(item.initials).toBe("AN")
  })

  it("treats a missing item count as zero", () => {
    expect(toAdminOrderListItem({ ...row, itemCount: null }).itemCount).toBe(0)
  })
})
