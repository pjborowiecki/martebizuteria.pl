import { describe, expect, it } from "vite-plus/test"

import { DISCOUNT_REJECTION, DISCOUNT_STATUS } from "~/src/modules/discount/discount.constants"
import {
  calculateDiscountAmount,
  normalizeDiscountCode,
  resolveDiscountRejection,
  resolveDiscountStatus,
} from "~/src/modules/discount/discount.utils"

const NOW = new Date("2026-06-01T12:00:00.000Z")

const BEFORE = new Date("2026-05-01T12:00:00.000Z")

const AFTER = new Date("2026-07-01T12:00:00.000Z")

const amountRow = (overrides = {}) => ({
  maxDiscountAmount: null,
  type: "percentage" as const,
  value: 10,
  ...overrides,
})

const rejectionRow = (overrides = {}) => ({
  endsAt: null,
  isActive: true,
  minOrderTotal: null,
  perCustomerLimit: null,
  startsAt: null,
  usageCount: 0,
  usageLimit: null,
  ...overrides,
})

const statusRow = (overrides = {}) => ({
  endsAt: null,
  isActive: true,
  startsAt: null,
  usageCount: 0,
  usageLimit: null,
  ...overrides,
})

describe("normalizeDiscountCode", () => {
  it("upper cases and trims so codes match however they were typed", () => {
    expect(normalizeDiscountCode("  spring-24  ")).toBe("SPRING-24")
  })
})

describe("calculateDiscountAmount", () => {
  it("takes a percentage off the item subtotal, not the shipping", () => {
    expect(calculateDiscountAmount({ itemsSubtotal: 20_000, row: amountRow({ value: 15 }), shippingTotal: 1500 })).toBe(3000)
  })

  it("honours a cap on what a percentage code may take off", () => {
    expect(
      calculateDiscountAmount({ itemsSubtotal: 100_000, row: amountRow({ maxDiscountAmount: 5000, value: 20 }), shippingTotal: 0 }),
    ).toBe(5000)
  })

  it("never takes a fixed amount larger than the basket", () => {
    expect(
      calculateDiscountAmount({ itemsSubtotal: 3000, row: amountRow({ type: "fixed_amount", value: 10_000 }), shippingTotal: 0 }),
    ).toBe(3000)
  })

  it("takes a fixed amount straight off the subtotal", () => {
    expect(
      calculateDiscountAmount({ itemsSubtotal: 20_000, row: amountRow({ type: "fixed_amount", value: 5000 }), shippingTotal: 0 }),
    ).toBe(5000)
  })

  it("makes free shipping worth exactly the shipping line", () => {
    expect(
      calculateDiscountAmount({ itemsSubtotal: 20_000, row: amountRow({ type: "free_shipping", value: 0 }), shippingTotal: 1499 }),
    ).toBe(1499)
  })

  it("clamps a percentage outside the sane range rather than trusting it", () => {
    expect(calculateDiscountAmount({ itemsSubtotal: 10_000, row: amountRow({ value: 500 }), shippingTotal: 0 })).toBe(10_000)
    expect(calculateDiscountAmount({ itemsSubtotal: 10_000, row: amountRow({ value: -20 }), shippingTotal: 0 })).toBe(0)
  })
})

const check = (overrides = {}, extra = {}) =>
  resolveDiscountRejection({ itemsSubtotal: 20_000, now: NOW, redeemedByCustomer: 0, row: rejectionRow(overrides), ...extra })

describe("resolveDiscountRejection", () => {
  it("accepts a code with no restrictions", () => {
    expect(check()).toBeUndefined()
  })

  it("turns down a disabled code", () => {
    expect(check({ isActive: false })).toBe(DISCOUNT_REJECTION.INACTIVE)
  })

  it("turns down a code whose window has not opened", () => {
    expect(check({ startsAt: AFTER })).toBe(DISCOUNT_REJECTION.NOT_STARTED)
  })

  it("turns down a code whose window has closed", () => {
    expect(check({ endsAt: BEFORE })).toBe(DISCOUNT_REJECTION.EXPIRED)
  })

  it("treats the end of the window as exclusive", () => {
    expect(check({ endsAt: NOW })).toBe(DISCOUNT_REJECTION.EXPIRED)
  })

  it("accepts a code inside its window", () => {
    expect(check({ endsAt: AFTER, startsAt: BEFORE })).toBeUndefined()
  })

  it("turns down a code that has hit its global limit", () => {
    expect(check({ usageCount: 50, usageLimit: 50 })).toBe(DISCOUNT_REJECTION.EXHAUSTED)
  })

  it("turns down a code this customer has already used up", () => {
    expect(check({ perCustomerLimit: 1 }, { redeemedByCustomer: 1 })).toBe(DISCOUNT_REJECTION.ALREADY_USED)
  })

  it("still accepts a per-customer code the customer has not used", () => {
    expect(check({ perCustomerLimit: 1 }, { redeemedByCustomer: 0 })).toBeUndefined()
  })

  it("turns down a basket below the minimum", () => {
    expect(check({ minOrderTotal: 30_000 })).toBe(DISCOUNT_REJECTION.MIN_ORDER_NOT_MET)
  })

  it("accepts a basket exactly on the minimum", () => {
    expect(check({ minOrderTotal: 20_000 })).toBeUndefined()
  })

  it("reports the most fundamental problem first", () => {
    expect(check({ endsAt: BEFORE, isActive: false, minOrderTotal: 99_999 })).toBe(DISCOUNT_REJECTION.INACTIVE)
  })
})

describe("resolveDiscountStatus", () => {
  it("calls a usable code active", () => {
    expect(resolveDiscountStatus(statusRow(), NOW)).toBe(DISCOUNT_STATUS.ACTIVE)
  })

  it("calls a switched-off code disabled whatever its dates say", () => {
    expect(resolveDiscountStatus(statusRow({ isActive: false, startsAt: AFTER }), NOW)).toBe(DISCOUNT_STATUS.DISABLED)
  })

  it("calls a lapsed code expired", () => {
    expect(resolveDiscountStatus(statusRow({ endsAt: BEFORE }), NOW)).toBe(DISCOUNT_STATUS.EXPIRED)
  })

  it("calls a fully redeemed code exhausted", () => {
    expect(resolveDiscountStatus(statusRow({ usageCount: 10, usageLimit: 10 }), NOW)).toBe(DISCOUNT_STATUS.EXHAUSTED)
  })

  it("calls a future code scheduled", () => {
    expect(resolveDiscountStatus(statusRow({ startsAt: AFTER }), NOW)).toBe(DISCOUNT_STATUS.SCHEDULED)
  })
})
