import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { DISCOUNT_REJECTION, DISCOUNT_TYPE } from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"

const stubs = vi.hoisted(() => ({
  getDiscountByCodeForCustomerQuery:
    vi.fn<(code: string, email: string | undefined) => Promise<Discount["selectForCustomer"] | undefined>>(),
}))

vi.mock("~/src/modules/discount/discount.accessors", () => ({
  getDiscountByCodeForCustomerQuery: stubs.getDiscountByCodeForCustomerQuery,
}))

const { resolveCheckoutDiscount } = await import("~/src/modules/discount/discount.checkout.server")

const NOW = new Date("2026-06-01T12:00:00.000Z")

const BASKET = { email: "ada@marte.test", itemsSubtotal: 20_000, shippingTotal: 1500 }

const discountRow = (overrides: Partial<Discount["selectForCustomer"]> = {}): Discount["selectForCustomer"] => ({
  code: "SPRING-24",
  createdAt: new Date("2026-05-01T00:00:00.000Z"),
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
  updatedAt: new Date("2026-05-01T00:00:00.000Z"),
  usageCount: 0,
  usageLimit: null,
  value: 15,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  stubs.getDiscountByCodeForCustomerQuery.mockResolvedValue(discountRow())
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

  it("reads the code however the shopper typed it, with the checkout email's redemptions", async () => {
    await resolveCheckoutDiscount({ ...BASKET, code: "  spring-24 " })

    expect(stubs.getDiscountByCodeForCustomerQuery).toHaveBeenCalledExactlyOnceWith("SPRING-24", "ada@marte.test")
  })

  it.each([undefined, "   "])("applies nothing and skips the lookup for the code %j", async (code) => {
    await expect(resolveCheckoutDiscount({ ...BASKET, code })).resolves.toBeUndefined()
    expect(stubs.getDiscountByCodeForCustomerQuery).not.toHaveBeenCalled()
  })

  it("applies nothing for a code that matches no discount", async () => {
    stubs.getDiscountByCodeForCustomerQuery.mockResolvedValue(undefined)

    await expect(resolveCheckoutDiscount({ ...BASKET, code: "NOPE-99" })).resolves.toBeUndefined()
  })

  it("drops a code the customer has already used up and logs why", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {})
    stubs.getDiscountByCodeForCustomerQuery.mockResolvedValue(discountRow({ perCustomerLimit: 1, redeemedByCustomer: 1 }))

    await expect(resolveCheckoutDiscount({ ...BASKET, code: "SPRING-24" })).resolves.toBeUndefined()
    expect(info).toHaveBeenCalledWith(`Discount SPRING-24 not applied to checkout: ${DISCOUNT_REJECTION.ALREADY_USED}.`)
  })

  it("judges the window against the moment the checkout is priced", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {})
    stubs.getDiscountByCodeForCustomerQuery.mockResolvedValue(discountRow({ endsAt: NOW }))

    await expect(resolveCheckoutDiscount({ ...BASKET, code: "SPRING-24" })).resolves.toBeUndefined()
  })
})
