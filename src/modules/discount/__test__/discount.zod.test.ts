import { describe, expect, it } from "vite-plus/test"

import { CART_LINES_MAX } from "~/src/modules/cart/cart.constants"
import { discountZodSchemas } from "~/src/modules/discount/discount.zod"

const BASKET = { code: "SPRING", lines: [{ qty: 1, variantId: "variant-a" }] }

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

  it("takes the basket as lines, with the chosen delivery method and the browser's open checkout session", () => {
    const basket = { ...BASKET, deliveryMethodId: "dm-courier", heldSessionId: "cs_test_own" }

    expect(discountZodSchemas.validateDiscountInput.parse(basket)).toStrictEqual(basket)
  })

  it("checks a code against an empty basket", () => {
    expect(discountZodSchemas.validateDiscountInput.parse({ ...BASKET, lines: [] })).toStrictEqual({ ...BASKET, lines: [] })
  })

  it.each([
    ["a line without a quantity", { lines: [{ qty: 0, variantId: "variant-a" }] }],
    ["a line without a variant", { lines: [{ qty: 1, variantId: "" }] }],
    ["more lines than a checkout takes", { lines: Array.from({ length: CART_LINES_MAX + 1 }, () => ({ qty: 1, variantId: "variant-a" })) }],
    ["an empty delivery method", { deliveryMethodId: "" }],
    ["an empty session id", { heldSessionId: "" }],
  ])("rejects %s", (_case, overrides) => {
    expect(discountZodSchemas.validateDiscountInput.safeParse({ ...BASKET, ...overrides }).success).toBe(false)
  })
})

const FORM = { code: "SPRING-24", type: "percentage", value: 15 }

const issuesOf = (values: Record<string, unknown>) =>
  discountZodSchemas.adminDiscountFormValues.safeParse(values).error?.issues.map(({ message, path }) => ({ message, path }))

describe("discountZodSchemas.adminDiscountFormValues", () => {
  it("accepts a percentage inside one to one hundred and activates it by default", () => {
    expect(discountZodSchemas.adminDiscountFormValues.parse(FORM)).toStrictEqual({ ...FORM, isActive: true })
  })

  it.each([0, 101])("rejects a %i percent discount", (value) => {
    expect(issuesOf({ ...FORM, value })).toStrictEqual([{ message: "validation.percentageRange", path: ["value"] }])
  })

  it("accepts the full one hundred percent", () => {
    expect(issuesOf({ ...FORM, value: 100 })).toBeUndefined()
  })

  it("rejects a fixed amount of nothing", () => {
    expect(issuesOf({ ...FORM, type: "fixed_amount", value: 0 })).toStrictEqual([{ message: "validation.amountRequired", path: ["value"] }])
  })

  it("accepts a fixed amount above one hundred because it is money, not a percentage", () => {
    expect(issuesOf({ ...FORM, type: "fixed_amount", value: 2500 })).toBeUndefined()
  })

  it("accepts free shipping without a value", () => {
    expect(issuesOf({ ...FORM, type: "free_shipping", value: 0 })).toBeUndefined()
  })

  it("rejects a window that ends before it starts", () => {
    expect(issuesOf({ ...FORM, endsAt: "2026-06-01T00:00:00.000Z", startsAt: "2026-06-30T00:00:00.000Z" })).toStrictEqual([
      { message: "validation.endBeforeStart", path: ["endsAt"] },
    ])
  })

  it("rejects a window that ends the moment it starts", () => {
    expect(issuesOf({ ...FORM, endsAt: "2026-06-01T02:00:00+02:00", startsAt: "2026-06-01T00:00:00.000Z" })).toStrictEqual([
      { message: "validation.endBeforeStart", path: ["endsAt"] },
    ])
  })

  it("accepts a window that ends after it starts", () => {
    expect(issuesOf({ ...FORM, endsAt: "2026-06-30T00:00:00.000Z", startsAt: "2026-06-01T00:00:00.000Z" })).toBeUndefined()
  })

  it.each([
    { endsAt: "2026-06-30T00:00:00.000Z", startsAt: "" },
    { endsAt: "", startsAt: "2026-06-01T00:00:00.000Z" },
    { endsAt: "2026-06-30T00:00:00.000Z" },
    { startsAt: "2026-06-01T00:00:00.000Z" },
  ])("accepts a window open on one side: %o", (window) => {
    expect(issuesOf({ ...FORM, ...window })).toBeUndefined()
  })

  it("rejects a code with spaces or punctuation", () => {
    expect(issuesOf({ ...FORM, code: "SPRING 24!" })).toStrictEqual([{ message: "validation.codeCharacters", path: ["code"] }])
  })
})
