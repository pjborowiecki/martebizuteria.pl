import { describe, expect, it } from "vite-plus/test"

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import {
  type AdminOrderFulfillmentSnapshot,
  buildAdminOrderDetailCustomer,
  buildAdminOrderFulfillmentSteps,
  mapAdminOrderDetailAddress,
  mapAdminOrderDetailItem,
  mapAdminOrderTimeline,
  resolveAdminOrderCustomerName,
  resolveAdminOrderDetailTags,
  resolveAdminOrderDispute,
} from "~/src/modules/order/order.detail.utils"

const PLACED_AT = new Date("2026-03-04T09:15:00.000Z")

const SHIPPED_AT = new Date("2026-03-06T11:40:00.000Z")

const DELIVERED_AT = new Date("2026-03-08T14:00:00.000Z")

const addressRow = {
  address1: "ul. Mokotowska 12/4",
  address2: null,
  city: "Warszawa",
  countryCode: "PL",
  firstName: "Anna",
  lastName: "Kowalska",
  phone: "+48 600 123 456",
  postalCode: "00-640",
  province: null,
}

const fulfillmentSnapshot = (overrides: Partial<AdminOrderFulfillmentSnapshot> = {}): AdminOrderFulfillmentSnapshot => ({
  canceledAt: null,
  createdAt: PLACED_AT,
  deliveredAt: null,
  fulfillmentStartedAt: undefined,
  shippedAt: null,
  status: "processing",
  ...overrides,
})

const tagSnapshot = (overrides = {}) => ({
  customerOrderCount: 1,
  deliveryType: undefined,
  hasCustomerNote: false,
  hasDispute: false,
  paymentStatus: "succeeded",
  refundedAmount: 0,
  userId: "user-1",
  ...overrides,
})

describe("resolveAdminOrderDispute", () => {
  it("reads a stored dispute out of the order metadata", () => {
    const metadata = JSON.stringify({ dispute: { amount: 12_000, id: "dp_1", reason: "fraudulent", status: "needs_response" } })

    expect(resolveAdminOrderDispute(metadata)).toStrictEqual({
      amount: 12_000,
      id: "dp_1",
      reason: "fraudulent",
      status: "needs_response",
    })
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

describe("mapAdminOrderDetailAddress", () => {
  it("joins the recipient name and keeps the optional lines", () => {
    expect(mapAdminOrderDetailAddress(addressRow)).toStrictEqual({
      city: "Warszawa",
      countryCode: "PL",
      line1: "ul. Mokotowska 12/4",
      line2: undefined,
      name: "Anna Kowalska",
      phone: "+48 600 123 456",
      postalCode: "00-640",
      province: undefined,
    })
  })

  it("falls back to a placeholder when no name was captured", () => {
    expect(mapAdminOrderDetailAddress({ ...addressRow, firstName: null, lastName: null })?.name).toBe("—")
  })

  it("maps a missing address to nothing", () => {
    expect(mapAdminOrderDetailAddress(null)).toBeUndefined()
    expect(mapAdminOrderDetailAddress(undefined)).toBeUndefined()
  })
})

describe("mapAdminOrderDetailItem", () => {
  const row = {
    id: "item-1",
    productHandle: "aura-hoop",
    quantity: 2,
    sku: "AUR-HP-001-GD",
    thumbnail: "https://cdn.example.com/aura.jpg",
    title: "Aura Hoop I",
    total: 37_000,
    unitPrice: 18_500,
    variantTitle: "18k Gold",
  }

  it("carries the priced line through with its catalogue details", () => {
    expect(mapAdminOrderDetailItem(row)).toStrictEqual({
      id: "item-1",
      imageUrl: "https://cdn.example.com/aura.jpg",
      productHandle: "aura-hoop",
      quantity: 2,
      sku: "AUR-HP-001-GD",
      title: "Aura Hoop I",
      totalMinorUnits: 37_000,
      unitPriceMinorUnits: 18_500,
      variantTitle: "18k Gold",
    })
  })

  it("leaves the image out when the variant has no thumbnail", () => {
    expect(mapAdminOrderDetailItem({ ...row, thumbnail: "" }).imageUrl).toBeUndefined()
    expect(mapAdminOrderDetailItem({ ...row, thumbnail: null }).imageUrl).toBeUndefined()
  })

  it("leaves the sku and variant out when the variant was deleted", () => {
    const orphan = mapAdminOrderDetailItem({ ...row, productHandle: null, sku: null, variantTitle: null })

    expect(orphan.sku).toBeUndefined()
    expect(orphan.variantTitle).toBeUndefined()
    expect(orphan.title).toBe("Aura Hoop I")
  })
})

describe("buildAdminOrderFulfillmentSteps", () => {
  it("leaves every step open while the order awaits payment", () => {
    const steps = buildAdminOrderFulfillmentSteps(fulfillmentSnapshot({ status: "pending" }))

    expect(steps.map((step) => step.done)).toStrictEqual([false, false, false, false])
  })

  it("confirms the order once it leaves the pending state", () => {
    const [confirmed] = buildAdminOrderFulfillmentSteps(fulfillmentSnapshot())

    expect(confirmed).toStrictEqual({ at: PLACED_AT, done: true, key: "confirmed" })
  })

  it("dates the processing step from the fulfilment audit entry", () => {
    const steps = buildAdminOrderFulfillmentSteps(fulfillmentSnapshot({ fulfillmentStartedAt: SHIPPED_AT }))

    expect(steps[1]).toStrictEqual({ at: SHIPPED_AT, done: true, key: "processing" })
  })

  it("backfills earlier steps once the parcel has shipped", () => {
    const steps = buildAdminOrderFulfillmentSteps(fulfillmentSnapshot({ shippedAt: SHIPPED_AT }))

    expect(steps.map((step) => step.done)).toStrictEqual([true, true, true, false])
    expect(steps[2]?.at).toBe(SHIPPED_AT)
  })

  it("completes the track once the parcel is delivered", () => {
    const steps = buildAdminOrderFulfillmentSteps(
      fulfillmentSnapshot({ deliveredAt: DELIVERED_AT, shippedAt: SHIPPED_AT, status: "completed" }),
    )

    expect(steps.map((step) => step.done)).toStrictEqual([true, true, true, true])
    expect(steps[3]?.at).toBe(DELIVERED_AT)
  })

  it("drops the track for a cancelled order", () => {
    expect(buildAdminOrderFulfillmentSteps(fulfillmentSnapshot({ canceledAt: DELIVERED_AT, status: "cancelled" }))).toStrictEqual([])
  })
})

describe("mapAdminOrderTimeline", () => {
  const auditRow = {
    action: AUDIT_LOG_ACTION.ORDER_SHIPPED,
    actorName: "System",
    createdAt: SHIPPED_AT,
    detail: "00259007123456789012",
    id: "audit-1",
    severity: "success" as const,
  }

  it("classifies an order audit entry and keeps its detail", () => {
    expect(mapAdminOrderTimeline([auditRow])[0]).toStrictEqual({
      actorName: "System",
      at: SHIPPED_AT,
      detail: "00259007123456789012",
      emailStatus: undefined,
      id: "audit-1",
      kind: "shipping",
      labelKey: "shipped",
      severity: "success",
    })
  })

  it("tags email entries with their delivery status", () => {
    const [sent] = mapAdminOrderTimeline([{ ...auditRow, action: AUDIT_LOG_ACTION.EMAIL_SENT }])

    expect(sent?.kind).toBe("email")
    expect(sent?.emailStatus).toBe("sent")
  })

  it("marks failed email entries", () => {
    expect(mapAdminOrderTimeline([{ ...auditRow, action: AUDIT_LOG_ACTION.EMAIL_FAILED }])[0]?.emailStatus).toBe("failed")
  })

  it("routes disputes to their own kind", () => {
    expect(mapAdminOrderTimeline([{ ...auditRow, action: AUDIT_LOG_ACTION.ORDER_DISPUTE_OPENED }])[0]?.kind).toBe("dispute")
  })

  it("drops a blank detail rather than rendering an empty line", () => {
    expect(mapAdminOrderTimeline([{ ...auditRow, detail: "   " }])[0]?.detail).toBeUndefined()
    expect(mapAdminOrderTimeline([{ ...auditRow, detail: null }])[0]?.detail).toBeUndefined()
  })

  it("falls back to the order kind for an unmapped action", () => {
    const [unmapped] = mapAdminOrderTimeline([{ ...auditRow, action: "order.unknown" }])

    expect(unmapped?.kind).toBe("order")
    expect(unmapped?.labelKey).toBe("order.unknown")
  })
})

describe("resolveAdminOrderDetailTags", () => {
  it("marks a guest checkout instead of a returning customer", () => {
    expect(resolveAdminOrderDetailTags(tagSnapshot({ customerOrderCount: 0, userId: null }))).toStrictEqual(["guest"])
  })

  it("marks a customer with repeat orders as returning", () => {
    expect(resolveAdminOrderDetailTags(tagSnapshot({ customerOrderCount: 2 }))).toStrictEqual(["returning"])
  })

  it("leaves a first-time registered customer untagged", () => {
    expect(resolveAdminOrderDetailTags(tagSnapshot())).toStrictEqual([])
  })

  it("names the delivery channel when it is not a plain courier", () => {
    expect(resolveAdminOrderDetailTags(tagSnapshot({ deliveryType: "locker" }))).toContain("locker")
    expect(resolveAdminOrderDetailTags(tagSnapshot({ deliveryType: "in_store" }))).toContain("inStore")
    expect(resolveAdminOrderDetailTags(tagSnapshot({ deliveryType: "courier" }))).toStrictEqual([])
  })

  it("separates a full refund from a partial one", () => {
    expect(resolveAdminOrderDetailTags(tagSnapshot({ paymentStatus: "refunded", refundedAmount: 38_900 }))).toContain("refunded")
    expect(resolveAdminOrderDetailTags(tagSnapshot({ refundedAmount: 1000 }))).toContain("partiallyRefunded")
  })

  it("flags disputes and customer notes", () => {
    expect(resolveAdminOrderDetailTags(tagSnapshot({ hasCustomerNote: true, hasDispute: true }))).toStrictEqual(["disputed", "note"])
  })
})

describe("resolveAdminOrderCustomerName", () => {
  it("prefers the account name", () => {
    expect(resolveAdminOrderCustomerName("Anna Kowalska", "anna@example.com")).toBe("Anna Kowalska")
  })

  it("falls back to the order email for guests and blank names", () => {
    expect(resolveAdminOrderCustomerName(null, "anna@example.com")).toBe("anna@example.com")
    expect(resolveAdminOrderCustomerName("   ", "anna@example.com")).toBe("anna@example.com")
  })
})

describe("buildAdminOrderDetailCustomer", () => {
  it("derives the initials and carries the account stats", () => {
    expect(
      buildAdminOrderDetailCustomer({
        email: "anna@example.com",
        name: "Anna Kowalska",
        orderCount: 3,
        phone: "+48 600 123 456",
        totalSpent: 120_000,
        userId: "user-1",
      }),
    ).toStrictEqual({
      email: "anna@example.com",
      initials: "AK",
      name: "Anna Kowalska",
      orderCount: 3,
      phone: "+48 600 123 456",
      totalSpentMinorUnits: 120_000,
      userId: "user-1",
    })
  })

  it("leaves the user id and phone unset for a guest order", () => {
    const guest = buildAdminOrderDetailCustomer({
      email: "guest@example.com",
      name: null,
      orderCount: 0,
      phone: null,
      totalSpent: 0,
      userId: null,
    })

    expect(guest.userId).toBeUndefined()
    expect(guest.phone).toBeUndefined()
    expect(guest.name).toBe("guest@example.com")
  })
})
