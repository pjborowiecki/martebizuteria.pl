import { describe, expect, it } from "vite-plus/test"

import { CHECKOUT_ERRORS, CHECKOUT_ERROR_CODES, getCheckoutErrorKey } from "~/src/integrations/stripe/stripe.errors"

import checkoutMessages from "~/messages/en-US/pages.checkout.json"

const translatedErrors: Record<string, string> = checkoutMessages.checkoutForm.errors

describe("getCheckoutErrorKey", () => {
  it("maps a thrown inventory failure to its translation key", () => {
    expect(getCheckoutErrorKey(new Error(CHECKOUT_ERROR_CODES.INSUFFICIENT_INVENTORY))).toBe("errors.insufficientInventory")
  })

  it("maps every known checkout error code to its own key", () => {
    const keys = Object.values(CHECKOUT_ERROR_CODES).map((code) => getCheckoutErrorKey(new Error(code)))

    expect(keys).toStrictEqual([
      "errors.insufficientInventory",
      "errors.invalidPrice",
      "errors.productNotFound",
      "errors.unknownError",
      "errors.variantNotFound",
    ])
  })

  it("falls back to the unknown error for an unrecognised message", () => {
    expect(getCheckoutErrorKey(new Error("card_declined"))).toBe("errors.unknownError")
  })

  it("falls back to the unknown error for an error that lost its message", () => {
    const cleared = new Error("cleared")
    cleared.message = ""

    expect(getCheckoutErrorKey(cleared)).toBe("errors.unknownError")
  })

  it("falls back to the unknown error for a value that is not an Error", () => {
    expect(getCheckoutErrorKey("INSUFFICIENT_INVENTORY")).toBe("errors.unknownError")
    expect(getCheckoutErrorKey(undefined)).toBe("errors.unknownError")
    expect(getCheckoutErrorKey({ message: CHECKOUT_ERROR_CODES.INVALID_PRICE })).toBe("errors.unknownError")
  })
})

describe("checkout error translation keys", () => {
  it("produces a key the English checkout copy actually defines", () => {
    for (const code of Object.values(CHECKOUT_ERROR_CODES)) {
      const key = getCheckoutErrorKey(new Error(code)).replace("errors.", "")

      expect(translatedErrors[key]).toBeTypeOf("string")
    }
  })

  it("keeps one distinct message per error code", () => {
    const messageKeys = Object.values(CHECKOUT_ERRORS)

    expect(new Set(messageKeys).size).toBe(messageKeys.length)
  })
})
