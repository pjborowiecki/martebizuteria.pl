import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { DISCOUNT_REJECTION, DISCOUNT_TYPE } from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"

const stubs = vi.hoisted(() => ({
  countCustomerRedemptions: vi.fn<(discountId: string, email: string | undefined) => Promise<number>>(),
  getDiscountByCode: vi.fn<(code: string) => Promise<Discount["select"] | undefined>>(),
}))

vi.mock("~/src/modules/discount/discount.accessors", () => ({
  countCustomerRedemptions: stubs.countCustomerRedemptions,
  getDiscountByCode: stubs.getDiscountByCode,
}))

const { resolveCheckoutDiscount } = await import("~/src/modules/discount/discount.checkout.server")

const NOW = new Date("2026-06-01T12:00:00.000Z")

const BASKET = { email: "ada@marte.test", itemsSubtotal: 20_000, shippingTotal: 1500 }

const discountRow = (overrides: Partial<Discount["select"]> = {}): Discount["select"] => ({
  code: "SPRING-24",
  createdAt: new Date("2026-05-01T00:00:00.000Z"),
  description: null,
  endsAt: null,
  id: "discount-1",
  isActive: true,
  maxDiscountAmount: null,
  minOrderTotal: null,
  perCustomerLimit: null,
  startsAt: null,
  type: DISCOUNT_TYPE.PERCENTAGE,
  updatedAt: new Date("2026-05-01T00:00:00.000Z"),
  usageCount: 0,
  usageLimit: null,
  value: 15,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  stubs.getDiscountByCode.mockResolvedValue(discountRow())
  stubs.countCustomerRedemptions.mockResolvedValue(0)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("resolveCheckoutDiscount", () => {
  it("applies a usable code to the checkout at its full value", async () => {
    await expect(resolveCheckoutDiscount({ ...BASKET, code: "SPRING-24" })).resolves.toStrictEqual({
      amountMinorUnits: 3000,
      code: "SPRING-24",
      discountId: "discount-1",
      type: DISCOUNT_TYPE.PERCENTAGE,
    })
  })

  it("looks the code up however the shopper typed it", async () => {
    await resolveCheckoutDiscount({ ...BASKET, code: "  spring-24 " })

    expect(stubs.getDiscountByCode).toHaveBeenCalledWith("SPRING-24")
  })

  it("applies nothing and skips the lookup when no code was entered", async () => {
    await expect(resolveCheckoutDiscount({ ...BASKET, code: undefined })).resolves.toBeUndefined()
    expect(stubs.getDiscountByCode).not.toHaveBeenCalled()
  })

  it("applies nothing and skips the lookup for a code made only of spaces", async () => {
    await expect(resolveCheckoutDiscount({ ...BASKET, code: "   " })).resolves.toBeUndefined()
    expect(stubs.getDiscountByCode).not.toHaveBeenCalled()
  })

  it("applies nothing for a code that matches no discount", async () => {
    stubs.getDiscountByCode.mockResolvedValue(undefined)

    await expect(resolveCheckoutDiscount({ ...BASKET, code: "NOPE-99" })).resolves.toBeUndefined()
    expect(stubs.countCustomerRedemptions).not.toHaveBeenCalled()
  })

  it("counts earlier redemptions against the checkout email", async () => {
    await resolveCheckoutDiscount({ ...BASKET, code: "SPRING-24" })

    expect(stubs.countCustomerRedemptions).toHaveBeenCalledWith("discount-1", "ada@marte.test")
  })

  it("drops a code the customer has already used up and logs why", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {})
    stubs.getDiscountByCode.mockResolvedValue(discountRow({ perCustomerLimit: 1 }))
    stubs.countCustomerRedemptions.mockResolvedValue(1)

    await expect(resolveCheckoutDiscount({ ...BASKET, code: "SPRING-24" })).resolves.toBeUndefined()
    expect(info).toHaveBeenCalledWith(`Discount SPRING-24 not applied to checkout: ${DISCOUNT_REJECTION.ALREADY_USED}.`)
  })

  it("drops a code whose window closed before the checkout started", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {})
    stubs.getDiscountByCode.mockResolvedValue(discountRow({ endsAt: NOW }))

    await expect(resolveCheckoutDiscount({ ...BASKET, code: "SPRING-24" })).resolves.toBeUndefined()
  })

  it("applies nothing when the code would take nothing off", async () => {
    stubs.getDiscountByCode.mockResolvedValue(discountRow({ type: DISCOUNT_TYPE.FREE_SHIPPING, value: 0 }))

    await expect(resolveCheckoutDiscount({ ...BASKET, code: "SPRING-24", shippingTotal: 0 })).resolves.toBeUndefined()
  })

  it("applies free shipping at the price of the chosen delivery", async () => {
    stubs.getDiscountByCode.mockResolvedValue(discountRow({ type: DISCOUNT_TYPE.FREE_SHIPPING, value: 0 }))

    await expect(resolveCheckoutDiscount({ ...BASKET, code: "SPRING-24" })).resolves.toMatchObject({
      amountMinorUnits: 1500,
      type: DISCOUNT_TYPE.FREE_SHIPPING,
    })
  })
})
