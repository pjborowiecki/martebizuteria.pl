import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { DISCOUNT_REJECTION, DISCOUNT_STATUS, DISCOUNT_TYPE } from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"
import {
  calculateDiscountAmount,
  normalizeDiscountCode,
  resolveAppliedCheckoutDiscount,
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
  redeemedByCustomer: 0,
  startsAt: null,
  usageCount: 0,
  usageLimit: null,
  ...overrides,
})

const customerRow = (overrides: Partial<Discount["selectForCustomer"]> = {}): Discount["selectForCustomer"] => ({
  code: "SPRING-24",
  createdAt: BEFORE,
  description: null,
  endsAt: null,
  id: "discount-1",
  isActive: true,
  maxDiscountAmount: null,
  minOrderTotal: null,
  perCustomerLimit: null,
  redeemedByCustomer: 0,
  startsAt: null,
  type: DISCOUNT_TYPE.PERCENTAGE,
  updatedAt: BEFORE,
  usageCount: 0,
  usageLimit: null,
  value: 15,
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

const check = (overrides = {}) => resolveDiscountRejection({ itemsSubtotal: 20_000, now: NOW, row: rejectionRow(overrides) })

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
    expect(check({ perCustomerLimit: 1, redeemedByCustomer: 1 })).toBe(DISCOUNT_REJECTION.ALREADY_USED)
  })

  it("still accepts a per-customer code the customer has not used", () => {
    expect(check({ perCustomerLimit: 1, redeemedByCustomer: 0 })).toBeUndefined()
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

const applyAtCheckout = (row: Discount["selectForCustomer"] | undefined, shippingTotal = 1500) =>
  resolveAppliedCheckoutDiscount({ itemsSubtotal: 20_000, now: NOW, row, shippingTotal })

describe("resolveAppliedCheckoutDiscount", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("applies a usable code to the checkout at its full value", () => {
    expect(applyAtCheckout(customerRow())).toStrictEqual({
      amountMinorUnits: 3000,
      code: "SPRING-24",
      discountId: "discount-1",
      type: DISCOUNT_TYPE.PERCENTAGE,
    })
  })

  it("applies nothing when no discount has the code", () => {
    expect(applyAtCheckout(undefined)).toBeUndefined()
  })

  it("drops a code the customer has already used up and logs why", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {})

    expect(applyAtCheckout(customerRow({ perCustomerLimit: 1, redeemedByCustomer: 1 }))).toBeUndefined()
    expect(info).toHaveBeenCalledWith(`Discount SPRING-24 not applied to checkout: ${DISCOUNT_REJECTION.ALREADY_USED}.`)
  })

  it("drops a code whose window closed before the checkout started", () => {
    vi.spyOn(console, "info").mockImplementation(() => {})

    expect(applyAtCheckout(customerRow({ endsAt: NOW }))).toBeUndefined()
  })

  it("applies nothing when the code would take nothing off", () => {
    expect(applyAtCheckout(customerRow({ type: DISCOUNT_TYPE.FREE_SHIPPING, value: 0 }), 0)).toBeUndefined()
  })

  it("applies free shipping at the price of the chosen delivery", () => {
    expect(applyAtCheckout(customerRow({ type: DISCOUNT_TYPE.FREE_SHIPPING, value: 0 }))).toMatchObject({
      amountMinorUnits: 1500,
      type: DISCOUNT_TYPE.FREE_SHIPPING,
    })
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
