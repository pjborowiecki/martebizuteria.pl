import { describe, expect, it } from "vite-plus/test"

import { TURNSTILE_TOKEN_MAX_LENGTH } from "~/src/integrations/cloudflare-turnstile/turnstile.constants"
import {
  cartItemSchema,
  createCheckoutSessionInputSchema,
  updateCheckoutSessionInputSchema,
} from "~/src/integrations/stripe/stripe.actions.schemas"

import { CART_LINES_MAX, CART_LINE_QUANTITY_MAX } from "~/src/modules/cart/cart.constants"

const checkoutValues = {
  address1: "ul. Mokotowska 12/4",
  city: "Warszawa",
  countryCode: "PL",
  deliveryMethod: "dpd-courier",
  email: "anna@example.com",
  firstName: "Anna",
  lastName: "Kowalska",
  phone: "+48600123456",
  postalCode: "00-640",
}

const cartItem = {
  id: "line-1",
  image: "https://assets.test/bracelet.jpg",
  qty: 2,
  slug: "bransoletka-aurora",
  title: "Bransoletka Aurora",
  variantId: "variant-1",
  variantTitle: "Rozmiar M",
}

const turnstileToken = "turnstile-token-1"

const cartLines = (count: number) => Array.from({ length: count }, (_, index) => ({ ...cartItem, id: `line-${String(index)}` }))

const firstIssue = (result: { success: boolean; error?: { issues: readonly { message: string; path: readonly PropertyKey[] }[] } }) =>
  result.error?.issues[0]

describe("cartItemSchema", () => {
  it("accepts a fully specified cart line", () => {
    expect(cartItemSchema.parse(cartItem)).toStrictEqual(cartItem)
  })

  it("drops the prices the browser remembers, so the server can only charge what the catalogue says", () => {
    expect(cartItemSchema.parse({ ...cartItem, price: "1,00 zł", priceChanged: true, rawPrice: 100 })).toStrictEqual(cartItem)
  })

  it("rejects a quantity of zero so an empty line cannot reach Stripe", () => {
    expect(cartItemSchema.safeParse({ ...cartItem, qty: 0 }).success).toBe(false)
    expect(cartItemSchema.safeParse({ ...cartItem, qty: -2 }).success).toBe(false)
  })

  it("requires the identifiers that link the line back to the catalogue", () => {
    for (const field of ["id", "slug", "variantId"]) {
      expect(cartItemSchema.safeParse({ ...cartItem, [field]: "" }).success).toBe(false)
    }
  })

  it("allows the display-only fields to be blank", () => {
    const blankDisplay = { ...cartItem, image: "", title: "", variantTitle: "" }

    expect(cartItemSchema.safeParse(blankDisplay).success).toBe(true)
  })

  it("rejects a quantity that is not a number", () => {
    expect(cartItemSchema.safeParse({ ...cartItem, qty: "2" }).success).toBe(false)
  })

  it("accepts up to the most of one piece an order may hold, and no more", () => {
    expect(cartItemSchema.safeParse({ ...cartItem, qty: CART_LINE_QUANTITY_MAX }).success).toBe(true)
    expect(cartItemSchema.safeParse({ ...cartItem, qty: CART_LINE_QUANTITY_MAX + 1 }).success).toBe(false)
  })

  it("rejects a fractional quantity, which no stock row or Stripe line can hold", () => {
    expect(cartItemSchema.safeParse({ ...cartItem, qty: 1.5 }).success).toBe(false)
  })
})

describe("createCheckoutSessionInputSchema", () => {
  it("applies the checkout defaults the form leaves out", () => {
    const parsed = createCheckoutSessionInputSchema.parse({ checkoutValues, items: [cartItem], turnstileToken })

    expect(parsed.checkoutValues.sameAsShipping).toBe(true)
    expect(parsed.checkoutValues.saveBillingAddress).toBe(false)
    expect(parsed.checkoutValues.saveShippingAddress).toBe(false)
    expect(parsed.items).toStrictEqual([cartItem])
  })

  it("refuses an empty cart", () => {
    const result = createCheckoutSessionInputSchema.safeParse({ checkoutValues, items: [], turnstileToken })

    expect(result.success).toBe(false)
    expect(firstIssue(result)?.path).toStrictEqual(["items"])
  })

  it("accepts the largest cart Stripe can carry beside the shipping line, and no more", () => {
    const largest = createCheckoutSessionInputSchema.safeParse({ checkoutValues, items: cartLines(CART_LINES_MAX), turnstileToken })
    const oversized = createCheckoutSessionInputSchema.safeParse({ checkoutValues, items: cartLines(CART_LINES_MAX + 1), turnstileToken })

    expect(largest.success).toBe(true)
    expect(firstIssue(oversized)?.path).toStrictEqual(["items"])
  })

  it("propagates a checkout validation key from the nested form schema", () => {
    const result = createCheckoutSessionInputSchema.safeParse({
      checkoutValues: { ...checkoutValues, postalCode: "0064" },
      items: [cartItem],
      turnstileToken,
    })

    expect(result.success).toBe(false)
    expect(firstIssue(result)?.message).toBe("validation.postCodeInvalid")
  })

  it("rejects a session request with an invalid phone number", () => {
    const result = createCheckoutSessionInputSchema.safeParse({
      checkoutValues: { ...checkoutValues, phone: "123" },
      items: [cartItem],
      turnstileToken,
    })

    expect(result.success).toBe(false)
    expect(firstIssue(result)?.message).toBe("validation.phoneInvalid")
  })

  it("rejects billing details that are missing when billing differs from shipping", () => {
    const result = createCheckoutSessionInputSchema.safeParse({
      checkoutValues: { ...checkoutValues, sameAsShipping: false },
      items: [cartItem],
      turnstileToken,
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toStrictEqual([
      "checkoutValues.billingAddress1",
      "checkoutValues.billingFirstName",
      "checkoutValues.billingLastName",
      "checkoutValues.billingCity",
      "checkoutValues.billingCountryCode",
      "checkoutValues.billingPostalCode",
    ])
  })

  it("hands the server the ten digits of a company's NIP and refuses one whose check digit is wrong", () => {
    const company = { billingCompanyName: "Pracownia Złotnicza sp. z o.o.", billingNip: "526-000-12-46", companyInvoice: true }
    const parsed = createCheckoutSessionInputSchema.parse({
      checkoutValues: { ...checkoutValues, ...company },
      items: [cartItem],
      turnstileToken,
    })
    const refused = createCheckoutSessionInputSchema.safeParse({
      checkoutValues: { ...checkoutValues, ...company, billingNip: "5260001245" },
      items: [cartItem],
      turnstileToken,
    })

    expect(parsed.checkoutValues).toMatchObject({ billingCompanyName: "Pracownia Złotnicza sp. z o.o.", billingNip: "5260001246" })
    expect(firstIssue(refused)).toMatchObject({ message: "validation.nipInvalid", path: ["checkoutValues", "billingNip"] })
  })

  it("does not accept a session id it has no session to update", () => {
    const parsed = createCheckoutSessionInputSchema.parse({ checkoutValues, items: [cartItem], sessionId: "cs_test_1", turnstileToken })

    expect(parsed).not.toHaveProperty("sessionId")
  })
})

describe("createCheckoutSessionInputSchema bot check", () => {
  it("refuses to open a checkout without a Turnstile token", () => {
    const missing = createCheckoutSessionInputSchema.safeParse({ checkoutValues, items: [cartItem] })
    const blank = createCheckoutSessionInputSchema.safeParse({ checkoutValues, items: [cartItem], turnstileToken: "" })

    expect(firstIssue(missing)?.path).toStrictEqual(["turnstileToken"])
    expect(firstIssue(blank)?.path).toStrictEqual(["turnstileToken"])
  })

  it("refuses a token longer than any Turnstile issues", () => {
    const result = createCheckoutSessionInputSchema.safeParse({
      checkoutValues,
      items: [cartItem],
      turnstileToken: "x".repeat(TURNSTILE_TOKEN_MAX_LENGTH + 1),
    })

    expect(firstIssue(result)?.path).toStrictEqual(["turnstileToken"])
  })
})

describe("updateCheckoutSessionInputSchema", () => {
  it("carries the session it has to update", () => {
    const parsed = updateCheckoutSessionInputSchema.parse({ checkoutValues, items: [cartItem], sessionId: "cs_test_1" })

    expect(parsed.sessionId).toBe("cs_test_1")
  })

  it("refuses an update without a session id", () => {
    const result = updateCheckoutSessionInputSchema.safeParse({ checkoutValues, items: [cartItem] })

    expect(result.success).toBe(false)
    expect(firstIssue(result)?.path).toStrictEqual(["sessionId"])
  })

  it("refuses a blank session id", () => {
    expect(updateCheckoutSessionInputSchema.safeParse({ checkoutValues, items: [cartItem], sessionId: "" }).success).toBe(false)
  })
})
