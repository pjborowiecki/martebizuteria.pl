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

const openSession = (paymentIntent: Parameters<typeof isCheckoutSessionProcessing>[0]["payment_intent"]) => ({
  payment_intent: paymentIntent,
  payment_status: "unpaid",
  status: "open",
})

describe("isCheckoutSessionProcessing", () => {
  it("treats a BLIK payment waiting for approval in the banking app as under way", () => {
    expect(isCheckoutSessionProcessing(openSession({ next_action: { type: "blik_authorize" }, status: "requires_action" }))).toBe(true)
  })

  it("treats a payment the bank is still processing as under way", () => {
    expect(isCheckoutSessionProcessing(openSession({ next_action: null, status: "processing" }))).toBe(true)
  })

  it.each([
    { action: "use_stripe_sdk", method: "a card's 3-D Secure challenge" },
    { action: "redirect_to_url", method: "a Przelewy24 redirect" },
  ])("leaves $method, which only the page that started it can finish, open to a fresh attempt", ({ action }) => {
    expect(isCheckoutSessionProcessing(openSession({ next_action: { type: action }, status: "requires_action" }))).toBe(false)
  })

  it("does not treat a payment intent that requires an action Stripe has not named as under way", () => {
    expect(isCheckoutSessionProcessing(openSession({ next_action: null, status: "requires_action" }))).toBe(false)
  })

  it.each(["requires_payment_method", "succeeded", "canceled"])("does not treat a payment intent that is %s as under way", (status) => {
    expect(isCheckoutSessionProcessing(openSession({ next_action: null, status }))).toBe(false)
  })

  it("does not treat a session nobody has started paying as under way", () => {
    expect(isCheckoutSessionProcessing(openSession(null))).toBe(false)
  })

  it("cannot tell from an unexpanded payment intent and treats the session as not under way", () => {
    expect(isCheckoutSessionProcessing(openSession("pi_test_1"))).toBe(false)
  })

  it("treats a completed session whose delayed-notification payment has not settled as under way", () => {
    expect(
      isCheckoutSessionProcessing({
        payment_intent: { next_action: null, status: "processing" },
        payment_status: "unpaid",
        status: "complete",
      }),
    ).toBe(true)
  })

  it.each(["paid", "no_payment_required"])("does not treat a completed session that is %s as under way", (paymentStatus) => {
    expect(
      isCheckoutSessionProcessing({
        payment_intent: { next_action: null, status: "succeeded" },
        payment_status: paymentStatus,
        status: "complete",
      }),
    ).toBe(false)
  })

  it("does not treat an expired session as under way, whatever its payment intent last reported", () => {
    expect(
      isCheckoutSessionProcessing({
        payment_intent: { next_action: null, status: "processing" },
        payment_status: "unpaid",
        status: "expired",
      }),
    ).toBe(false)
  })
})
