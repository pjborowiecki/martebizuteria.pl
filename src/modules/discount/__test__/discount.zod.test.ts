import { describe, expect, it } from "vite-plus/test"

import { discountZodSchemas } from "~/src/modules/discount/discount.zod"

const BASKET = { code: "SPRING", itemsSubtotal: 24_900, shippingTotal: 1900 }

describe("discountZodSchemas.validateDiscountInput", () => {
  it("checks a code before the shopper has typed an email", () => {
    expect(discountZodSchemas.validateDiscountInput.parse({ ...BASKET, email: "" })).toStrictEqual({ ...BASKET, email: undefined })
  })

  it("checks a code when no email is sent at all", () => {
    expect(discountZodSchemas.validateDiscountInput.parse(BASKET)).toStrictEqual(BASKET)
  })

  it("keeps a well-formed email for the per-customer limit", () => {
    expect(discountZodSchemas.validateDiscountInput.parse({ ...BASKET, email: "ada@marte.test" }).email).toBe("ada@marte.test")
  })

  it("rejects a malformed email", () => {
    expect(discountZodSchemas.validateDiscountInput.safeParse({ ...BASKET, email: "ada@" }).success).toBe(false)
  })
})
