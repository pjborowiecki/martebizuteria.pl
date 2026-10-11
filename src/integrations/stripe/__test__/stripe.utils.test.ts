import { describe, expect, it } from "vite-plus/test"

import { isCheckoutSessionProcessing, resolveStripeObjectId } from "~/src/integrations/stripe/stripe.utils"

describe("resolveStripeObjectId", () => {
  it("returns an unexpanded reference as it is", () => {
    expect(resolveStripeObjectId("pi_test_1")).toBe("pi_test_1")
  })

  it("reads the id of an expanded object", () => {
    expect(resolveStripeObjectId({ id: "pi_test_1" })).toBe("pi_test_1")
  })

  it("returns undefined for an absent reference", () => {
    expect(resolveStripeObjectId(null)).toBeUndefined()
  })
})

describe("isCheckoutSessionProcessing", () => {
  it("treats a BLIK payment waiting for approval in the banking app as under way", () => {
    expect(isCheckoutSessionProcessing({ payment_intent: { next_action: { type: "blik_authorize" }, status: "requires_action" } })).toBe(
      true,
    )
  })

  it("treats a payment the bank is still processing as under way", () => {
    expect(isCheckoutSessionProcessing({ payment_intent: { next_action: null, status: "processing" } })).toBe(true)
  })

  it.each([
    { action: "use_stripe_sdk", method: "a card's 3-D Secure challenge" },
    { action: "redirect_to_url", method: "a Przelewy24 redirect" },
  ])("leaves $method, which only the page that started it can finish, open to a fresh attempt", ({ action }) => {
    expect(isCheckoutSessionProcessing({ payment_intent: { next_action: { type: action }, status: "requires_action" } })).toBe(false)
  })

  it("does not treat a payment intent that requires an action Stripe has not named as under way", () => {
    expect(isCheckoutSessionProcessing({ payment_intent: { next_action: null, status: "requires_action" } })).toBe(false)
  })

  it.each(["requires_payment_method", "succeeded", "canceled"])("does not treat a payment intent that is %s as under way", (status) => {
    expect(isCheckoutSessionProcessing({ payment_intent: { next_action: null, status } })).toBe(false)
  })

  it("does not treat a session nobody has started paying as under way", () => {
    expect(isCheckoutSessionProcessing({ payment_intent: null })).toBe(false)
  })

  it("cannot tell from an unexpanded payment intent and treats the session as not under way", () => {
    expect(isCheckoutSessionProcessing({ payment_intent: "pi_test_1" })).toBe(false)
  })
})
