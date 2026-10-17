import { describe, expect, it } from "vite-plus/test"

import {
  cartItemSchema,
  createCheckoutSessionInputSchema,
  updateCheckoutSessionInputSchema,
} from "~/src/integrations/stripe/stripe.actions.schemas"
import { CHECKOUT_SESSION_ID_MAX_LENGTH } from "~/src/integrations/stripe/stripe.constants"

import { CART_LINES_MAX, CART_LINE_QUANTITY_MAX } from "~/src/modules/cart/cart.constants"
import { PRODUCT_VARIANT_COLUMN_LENGTH } from "~/src/modules/product-variant/product-variant.constants"
import { PRODUCT_COLUMN_LENGTH } from "~/src/modules/product/product.constants"

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

const cartItem = { qty: 2, slug: "bransoletka-aurora", variantId: "variant-1" }

const browserCartItem = {
  ...cartItem,
  id: "line-1",
  image: "https://assets.test/bracelet.jpg",
  price: "249,00 zł",
  priceChanged: true,
  rawPrice: 24_900,
  title: "Bransoletka Aurora",
  variantTitle: "Rozmiar M",
}

const cartLines = (count: number) => Array.from({ length: count }, (_, index) => ({ ...cartItem, id: `line-${String(index)}` }))

const firstIssue = (result: { success: boolean; error?: { issues: readonly { message: string; path: readonly PropertyKey[] }[] } }) =>
  result.error?.issues[0]

describe("cartItemSchema", () => {
  it("accepts a line that names only its product, variant and quantity", () => {
    expect(cartItemSchema.parse(cartItem)).toStrictEqual(cartItem)
  })

  it("drops the title, image and prices a cart in the browser remembers, so the server takes them from the catalogue", () => {
    expect(cartItemSchema.parse(browserCartItem)).toStrictEqual(cartItem)
  })

  it("ignores display fields of any size, since none of them reaches the server", () => {
    const oversized = "x".repeat(100_000)

    expect(cartItemSchema.parse({ ...browserCartItem, image: oversized, title: oversized, variantTitle: oversized })).toStrictEqual(
      cartItem,
    )
  })

  it("refuses a handle or variant id longer than the catalogue stores", () => {
    const longestHandle = "a".repeat(PRODUCT_COLUMN_LENGTH.handle)
    const longestVariantId = "v".repeat(PRODUCT_VARIANT_COLUMN_LENGTH.id)

    expect(cartItemSchema.safeParse({ ...cartItem, slug: longestHandle, variantId: longestVariantId }).success).toBe(true)
    expect(cartItemSchema.safeParse({ ...cartItem, slug: `${longestHandle}a` }).success).toBe(false)
    expect(cartItemSchema.safeParse({ ...cartItem, variantId: `${longestVariantId}v` }).success).toBe(false)
  })

  it("rejects a quantity of zero so an empty line cannot reach Stripe", () => {
    expect(cartItemSchema.safeParse({ ...cartItem, qty: 0 }).success).toBe(false)
    expect(cartItemSchema.safeParse({ ...cartItem, qty: -2 }).success).toBe(false)
  })

  it("requires the identifiers that link the line back to the catalogue", () => {
    for (const field of ["slug", "variantId"]) {
      expect(cartItemSchema.safeParse({ ...cartItem, [field]: "" }).success).toBe(false)
    }
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
    const parsed = createCheckoutSessionInputSchema.parse({ checkoutValues, items: [cartItem] })

    expect(parsed.checkoutValues.sameAsShipping).toBe(true)
    expect(parsed.checkoutValues.saveBillingAddress).toBe(false)
    expect(parsed.checkoutValues.saveShippingAddress).toBe(false)
    expect(parsed.items).toStrictEqual([cartItem])
  })

  it("refuses an empty cart", () => {
    const result = createCheckoutSessionInputSchema.safeParse({ checkoutValues, items: [] })

    expect(result.success).toBe(false)
    expect(firstIssue(result)?.path).toStrictEqual(["items"])
  })

  it("accepts the largest cart Stripe can carry beside the shipping line, and no more", () => {
    const largest = createCheckoutSessionInputSchema.safeParse({ checkoutValues, items: cartLines(CART_LINES_MAX) })
    const oversized = createCheckoutSessionInputSchema.safeParse({ checkoutValues, items: cartLines(CART_LINES_MAX + 1) })

    expect(largest.success).toBe(true)
    expect(firstIssue(oversized)?.path).toStrictEqual(["items"])
  })

  it("propagates a checkout validation key from the nested form schema", () => {
    const result = createCheckoutSessionInputSchema.safeParse({
      checkoutValues: { ...checkoutValues, postalCode: "0064" },
      items: [cartItem],
    })

    expect(result.success).toBe(false)
    expect(firstIssue(result)?.message).toBe("validation.postCodeInvalid")
  })

  it("rejects a session request with an invalid phone number", () => {
    const result = createCheckoutSessionInputSchema.safeParse({
      checkoutValues: { ...checkoutValues, phone: "123" },
      items: [cartItem],
    })

    expect(result.success).toBe(false)
    expect(firstIssue(result)?.message).toBe("validation.phoneInvalid")
  })

  it("rejects billing details that are missing when billing differs from shipping", () => {
    const result = createCheckoutSessionInputSchema.safeParse({
      checkoutValues: { ...checkoutValues, sameAsShipping: false },
      items: [cartItem],
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
    const parsed = createCheckoutSessionInputSchema.parse({ checkoutValues: { ...checkoutValues, ...company }, items: [cartItem] })
    const refused = createCheckoutSessionInputSchema.safeParse({
      checkoutValues: { ...checkoutValues, ...company, billingNip: "5260001245" },
      items: [cartItem],
    })

    expect(parsed.checkoutValues).toMatchObject({ billingCompanyName: "Pracownia Złotnicza sp. z o.o.", billingNip: "5260001246" })
    expect(firstIssue(refused)).toMatchObject({ message: "validation.nipInvalid", path: ["checkoutValues", "billingNip"] })
  })

  it("does not accept a session id it has no session to update", () => {
    const parsed = createCheckoutSessionInputSchema.parse({ checkoutValues, items: [cartItem], sessionId: "cs_test_1" })

    expect(parsed).not.toHaveProperty("sessionId")
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

  it("refuses a session id longer than the checkout page accepts in its address", () => {
    const longest = `cs_${"a".repeat(CHECKOUT_SESSION_ID_MAX_LENGTH - 3)}`
    const tooLong = updateCheckoutSessionInputSchema.safeParse({ checkoutValues, items: [cartItem], sessionId: `${longest}a` })

    expect(updateCheckoutSessionInputSchema.safeParse({ checkoutValues, items: [cartItem], sessionId: longest }).success).toBe(true)
    expect(firstIssue(tooLong)?.path).toStrictEqual(["sessionId"])
  })
})
