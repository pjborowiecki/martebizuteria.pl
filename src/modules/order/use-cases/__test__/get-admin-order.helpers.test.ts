import { describe, expect, it, vi } from "vite-plus/test"

import {
  type AdminOrderFulfillmentSnapshot,
  buildAdminOrderDetailCustomer,
  buildAdminOrderFulfillmentSteps,
  resolveAdminOrderCustomerName,
  resolveAdminOrderDetailTags,
} from "~/src/modules/order/use-cases/get-admin-order"

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({ db: {} }))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "en-US" }))
vi.mock("~/src/integrations/inpost/inpost.shipx.server", () => ({ isInpostShipxConfigured: () => true }))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: () => vi.fn(),
      middleware: () => builder,
      validator: () => builder,
    }

    return builder
  },
}))

const PLACED_AT = new Date("2026-03-04T09:15:00.000Z")

const SHIPPED_AT = new Date("2026-03-06T11:40:00.000Z")

const DELIVERED_AT = new Date("2026-03-08T14:00:00.000Z")

const fulfillmentSnapshot = (overrides: Partial<AdminOrderFulfillmentSnapshot> = {}): AdminOrderFulfillmentSnapshot => ({
  canceledAt: null,
  createdAt: PLACED_AT,
  deliveredAt: null,
  fulfillmentStartedAt: null,
  fulfillmentStatus: "not_fulfilled",
  shippedAt: null,
  status: "processing",
  ...overrides,
})

const tagSnapshot = (overrides = {}) => ({
  awaitsRestock: false,
  customerOrderCount: 1,
  deliveryType: undefined,
  hasCustomerNote: false,
  hasDispute: false,
  lockerUnconfirmed: false,
  paymentStatus: "succeeded",
  refundedAmount: 0,
  userId: "user-1",
  ...overrides,
})

describe("buildAdminOrderFulfillmentSteps", () => {
  it("leaves every step open while the order awaits payment", () => {
    const steps = buildAdminOrderFulfillmentSteps(fulfillmentSnapshot({ status: "pending" }))

    expect(steps.map((step) => step.done)).toStrictEqual([false, false, false, false])
  })

  it("confirms a paid order and stops there until fulfilment starts", () => {
    const steps = buildAdminOrderFulfillmentSteps(fulfillmentSnapshot())

    expect(steps[0]).toStrictEqual({ at: PLACED_AT, done: true, key: "confirmed" })
    expect(steps.map((step) => step.done)).toStrictEqual([true, false, false, false])
  })

  it("dates the processing step from the time fulfilment started", () => {
    const steps = buildAdminOrderFulfillmentSteps(fulfillmentSnapshot({ fulfillmentStartedAt: SHIPPED_AT, fulfillmentStatus: "fulfilled" }))

    expect(steps[1]).toStrictEqual({ at: SHIPPED_AT, done: true, key: "processing" })
    expect(steps[2]).toStrictEqual({ at: undefined, done: false, key: "shipped" })
  })

  it("leaves the in-progress step open for an order stepped back before it", () => {
    const steps = buildAdminOrderFulfillmentSteps(fulfillmentSnapshot({ fulfillmentStartedAt: SHIPPED_AT }))

    expect(steps[1]).toStrictEqual({ at: undefined, done: false, key: "processing" })
  })

  it("backfills earlier steps once the parcel has shipped", () => {
    const steps = buildAdminOrderFulfillmentSteps(fulfillmentSnapshot({ fulfillmentStatus: "shipped", shippedAt: SHIPPED_AT }))

    expect(steps.map((step) => step.done)).toStrictEqual([true, true, true, false])
    expect(steps[2]?.at).toBe(SHIPPED_AT)
  })

  it("leaves the shipping time blank for a shipped order that never recorded one", () => {
    const steps = buildAdminOrderFulfillmentSteps(fulfillmentSnapshot({ fulfillmentStatus: "shipped" }))

    expect(steps[2]).toStrictEqual({ at: undefined, done: true, key: "shipped" })
  })

  it("completes the track once the parcel is delivered", () => {
    const steps = buildAdminOrderFulfillmentSteps(
      fulfillmentSnapshot({ deliveredAt: DELIVERED_AT, fulfillmentStatus: "delivered", shippedAt: SHIPPED_AT, status: "completed" }),
    )

    expect(steps.map((step) => step.done)).toStrictEqual([true, true, true, true])
    expect(steps[3]?.at).toBe(DELIVERED_AT)
  })

  it("leaves the delivery time blank for a delivered order that never recorded one", () => {
    const steps = buildAdminOrderFulfillmentSteps(fulfillmentSnapshot({ fulfillmentStatus: "delivered", status: "completed" }))

    expect(steps[3]).toStrictEqual({ at: undefined, done: true, key: "delivered" })
  })

  it("drops the track for a cancelled order", () => {
    expect(buildAdminOrderFulfillmentSteps(fulfillmentSnapshot({ canceledAt: DELIVERED_AT, status: "cancelled" }))).toStrictEqual([])
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

  it("flags a locker InPost could not confirm when the order was placed", () => {
    expect(resolveAdminOrderDetailTags(tagSnapshot({ deliveryType: "locker", lockerUnconfirmed: true }))).toStrictEqual([
      "locker",
      "lockerUnconfirmed",
    ])
  })

  it("separates a full refund from a partial one", () => {
    expect(resolveAdminOrderDetailTags(tagSnapshot({ paymentStatus: "refunded", refundedAmount: 38_900 }))).toContain("refunded")
    expect(resolveAdminOrderDetailTags(tagSnapshot({ refundedAmount: 1000 }))).toContain("partiallyRefunded")
  })

  it("flags disputes and customer notes", () => {
    expect(resolveAdminOrderDetailTags(tagSnapshot({ hasCustomerNote: true, hasDispute: true }))).toStrictEqual(["disputed", "note"])
  })

  it("flags a refunded order whose items have not gone back to stock", () => {
    expect(
      resolveAdminOrderDetailTags(tagSnapshot({ awaitsRestock: true, paymentStatus: "refunded", refundedAmount: 38_900 })),
    ).toStrictEqual(["refunded", "notRestocked"])
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
        accountEmail: "Anna@Example.com",
        email: "anna@example.com",
        name: "Anna Kowalska",
        orderCount: 3,
        phone: "+48 600 123 456",
        recipient: "anna@example.com",
        totalSpent: 120_000,
        userId: "user-1",
      }),
    ).toStrictEqual({
      accountEmail: undefined,
      email: "anna@example.com",
      initials: "AK",
      name: "Anna Kowalska",
      orderCount: 3,
      phone: "+48 600 123 456",
      recipientEmail: undefined,
      totalSpentMinorUnits: 120_000,
      userId: "user-1",
    })
  })

  it("names the account's address and where the order's e-mails go once the account has replaced the order's address", () => {
    expect(
      buildAdminOrderDetailCustomer({
        accountEmail: "anna@new.example",
        email: "anna@example.com",
        name: "Anna Kowalska",
        orderCount: 3,
        phone: null,
        recipient: "anna@new.example",
        totalSpent: 120_000,
        userId: "user-1",
      }),
    ).toMatchObject({ accountEmail: "anna@new.example", email: "anna@example.com", recipientEmail: "anna@new.example" })
  })

  it("leaves the user id and phone unset for a guest order", () => {
    const guest = buildAdminOrderDetailCustomer({
      accountEmail: undefined,
      email: "guest@example.com",
      name: null,
      orderCount: 0,
      phone: null,
      recipient: "guest@example.com",
      totalSpent: 0,
      userId: null,
    })

    expect(guest.userId).toBeUndefined()
    expect(guest.phone).toBeUndefined()
    expect(guest.name).toBe("guest@example.com")
  })
})
