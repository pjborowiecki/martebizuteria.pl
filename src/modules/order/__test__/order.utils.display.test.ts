import { describe, expect, it } from "vite-plus/test"

import { ADMIN_ORDER_FULFILLMENT_UI_KEY, ADMIN_ORDER_PAYMENT_UI_KEY } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"
import {
  clearDisputeMetadata,
  formatAdminOrderDate,
  formatOrderAddressLocality,
  mergeDisputeMetadata,
  parseOrderMetadata,
  resolveAdminOrderDispute,
  resolveAdminOrderFulfillmentUiKey,
  resolveAdminOrderPaymentUiKey,
  resolveOrderLocale,
  resolveOrderTrackingUrl,
  toAdminOrderListItem,
} from "~/src/modules/order/order.utils"

const dispute = { amount: 12_000, id: "dp_1", reason: "fraudulent", status: "needs_response" }

const FULFILMENT_UI_CASES: [Order["select"]["fulfillmentStatus"], string][] = [
  ["not_fulfilled", ADMIN_ORDER_FULFILLMENT_UI_KEY.CONFIRMED],
  ["partially_fulfilled", ADMIN_ORDER_FULFILLMENT_UI_KEY.CONFIRMED],
  ["fulfilled", ADMIN_ORDER_FULFILLMENT_UI_KEY.PROCESSING],
  ["shipped", ADMIN_ORDER_FULFILLMENT_UI_KEY.SHIPPED],
  ["delivered", ADMIN_ORDER_FULFILLMENT_UI_KEY.DELIVERED],
  ["cancelled", ADMIN_ORDER_FULFILLMENT_UI_KEY.CANCELLED],
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

describe("resolveAdminOrderDispute", () => {
  it("reads a stored dispute out of the order metadata", () => {
    expect(resolveAdminOrderDispute(mergeDisputeMetadata('{"locale":"en-US"}', dispute))).toStrictEqual(dispute)
  })

  it("returns nothing for metadata without a dispute", () => {
    expect(resolveAdminOrderDispute(JSON.stringify({ locale: "pl-PL" }))).toBeUndefined()
    expect(resolveAdminOrderDispute(null)).toBeUndefined()
    expect(resolveAdminOrderDispute("not json")).toBeUndefined()
  })

  it("rejects a malformed dispute rather than surfacing it", () => {
    expect(resolveAdminOrderDispute(JSON.stringify({ dispute: { id: "dp_1" } }))).toBeUndefined()
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

  it("tells an order whose fulfilment started apart from one that is only paid", () => {
    expect(resolveAdminOrderFulfillmentUiKey("processing", "fulfilled")).not.toBe(
      resolveAdminOrderFulfillmentUiKey("processing", "not_fulfilled"),
    )
  })

  it("shows a cancelled order as cancelled, never as returned", () => {
    expect(resolveAdminOrderFulfillmentUiKey("cancelled", "not_fulfilled")).toBe(ADMIN_ORDER_FULFILLMENT_UI_KEY.CANCELLED)
  })

  it("keeps the step a refunded order reached", () => {
    expect(resolveAdminOrderFulfillmentUiKey("refunded", "delivered")).toBe(ADMIN_ORDER_FULFILLMENT_UI_KEY.DELIVERED)
  })
})

describe("formatAdminOrderDate", () => {
  it("formats in the viewer's format locale", () => {
    expect(formatAdminOrderDate(new Date("2024-06-15T12:00:00.000Z"), { formatLocale: "en-US", timeZone: "Europe/Warsaw" })).toBe(
      "Jun 15, 2024",
    )
  })

  it("accepts a stored date string and names the day in the viewer's time zone", () => {
    expect(formatAdminOrderDate("2024-06-15T23:30:00.000Z", { formatLocale: "pl-PL", timeZone: "Europe/Warsaw" })).toBe("16 cze 2024")
    expect(formatAdminOrderDate("2024-06-15T23:30:00.000Z", { formatLocale: "en-US", timeZone: "America/New_York" })).toBe("Jun 15, 2024")
  })
})

describe("formatOrderAddressLocality", () => {
  const locality = { city: "Warszawa", countryCode: "PL", postalCode: "00-640", province: undefined }

  it("puts the postal code before the city and names the country in the reader's language", () => {
    expect(formatOrderAddressLocality(locality, "pl-PL")).toBe("00-640 Warszawa, Polska")
    expect(formatOrderAddressLocality(locality, "en-US")).toBe("00-640 Warszawa, Poland")
  })

  it("adds the province and leaves out a postal code that was never captured", () => {
    expect(formatOrderAddressLocality({ ...locality, postalCode: undefined, province: "mazowieckie" }, "en-US")).toBe(
      "Warszawa, mazowieckie, Poland",
    )
  })

  it("leaves out a postal code or province stored empty, as an e-mail's address row may hold them", () => {
    expect(formatOrderAddressLocality({ ...locality, postalCode: null, province: "  " }, "pl-PL")).toBe("Warszawa, Polska")
    expect(formatOrderAddressLocality({ ...locality, postalCode: " ", province: null }, "en-US")).toBe("Warszawa, Poland")
  })

  it("keeps the code of a region it cannot name", () => {
    expect(formatOrderAddressLocality({ ...locality, countryCode: "XX" }, "en-US")).toBe("00-640 Warszawa, XX")
    expect(formatOrderAddressLocality({ ...locality, countryCode: "not-a-region" }, "en-US")).toBe("00-640 Warszawa, not-a-region")
  })
})

describe("toAdminOrderListItem", () => {
  const row = {
    createdAt: new Date(2024, 5, 15),
    currencyCode: "PLN",
    customerName: "Anna Kowalska",
    deliveredEmailAt: null,
    email: "anna@example.com",
    fulfillmentStatus: "not_fulfilled" as const,
    id: "order-1",
    inProgressEmailAt: null,
    itemCount: 3,
    metadata: '{"locale":"pl-PL"}',
    orderNumber: "MRT-2024-00001",
    paymentStatus: "succeeded",
    shippedEmailAt: null,
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
      emailedSteps: [],
      fulfillmentStatus: "not_fulfilled",
      fulfillmentUiKey: ADMIN_ORDER_FULFILLMENT_UI_KEY.CONFIRMED,
      hasOpenDispute: false,
      id: "order-1",
      initials: "AK",
      itemCount: 3,
      orderNumber: "MRT-2024-00001",
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

  it("marks an order whose metadata carries an open dispute", () => {
    expect(toAdminOrderListItem({ ...row, metadata: mergeDisputeMetadata(row.metadata, dispute) }).hasOpenDispute).toBe(true)
  })

  it("marks no dispute once the dispute closes", () => {
    const closed = clearDisputeMetadata(mergeDisputeMetadata(row.metadata, dispute))

    expect(toAdminOrderListItem({ ...row, metadata: closed }).hasOpenDispute).toBe(false)
  })

  it("lists the steps whose e-mail the customer was already sent", () => {
    const sentAt = new Date(2024, 5, 16)

    expect(toAdminOrderListItem({ ...row, inProgressEmailAt: sentAt, shippedEmailAt: sentAt }).emailedSteps).toStrictEqual([
      "processing",
      "shipped",
    ])
    expect(toAdminOrderListItem({ ...row, deliveredEmailAt: sentAt }).emailedSteps).toStrictEqual(["delivered"])
  })
})

describe("resolveOrderTrackingUrl", () => {
  it("links a tracking number pasted by hand for an InPost delivery to InPost's tracking page", () => {
    expect(
      resolveOrderTrackingUrl({
        courierCode: "inpost",
        deliveryType: "locker",
        trackingNumber: " 520000011395200025754311 ",
        trackingUrl: null,
      }),
    ).toBe("https://inpost.pl/sledzenie-przesylek?number=520000011395200025754311")
    expect(resolveOrderTrackingUrl({ courierCode: "inpost", deliveryType: "courier", trackingNumber: "PL 123", trackingUrl: "" })).toBe(
      "https://inpost.pl/sledzenie-przesylek?number=PL%20123",
    )
  })

  it("keeps the link the admin entered", () => {
    expect(
      resolveOrderTrackingUrl({
        courierCode: "dpd",
        deliveryType: "courier",
        trackingNumber: "PL123",
        trackingUrl: " https://tracking.test/PL123 ",
      }),
    ).toBe("https://tracking.test/PL123")
  })

  it("links nothing for a delivery InPost does not carry, or without a number", () => {
    expect(
      resolveOrderTrackingUrl({ courierCode: "inpost", deliveryType: "in_store", trackingNumber: "PL123", trackingUrl: null }),
    ).toBeUndefined()
    expect(
      resolveOrderTrackingUrl({ courierCode: undefined, deliveryType: undefined, trackingNumber: "PL123", trackingUrl: undefined }),
    ).toBeUndefined()
    expect(
      resolveOrderTrackingUrl({ courierCode: "inpost", deliveryType: "locker", trackingNumber: " ", trackingUrl: null }),
    ).toBeUndefined()
  })

  it("does not send a number another carrier gave to InPost's tracking page", () => {
    expect(
      resolveOrderTrackingUrl({ courierCode: "dpd", deliveryType: "courier", trackingNumber: "PL123", trackingUrl: null }),
    ).toBeUndefined()
  })
})
