import { describe, expect, it } from "vite-plus/test"

import {
  CHECKOUT_PAYMENT_METHOD_ORDER,
  CHECKOUT_SESSION_LIFETIME_SECONDS,
  STRIPE_API_VERSION,
  STRIPE_CURRENCY,
  STRIPE_WEBHOOK_EVENTS,
} from "~/src/integrations/stripe/stripe.constants"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"

describe("stripe constants", () => {
  it("pins the Stripe API version the integration was written against", () => {
    expect(STRIPE_API_VERSION).toBe("2026-09-30.endive")
  })

  it("sends the store currency to Stripe in the lowercase form its API expects", () => {
    expect(STRIPE_CURRENCY).toBe(STORE_CURRENCY_CODE.toLowerCase())
  })

  it("offers the Polish payment methods in the order the storefront promotes them", () => {
    expect(CHECKOUT_PAYMENT_METHOD_ORDER).toStrictEqual(["card", "blik", "p24"])
  })

  it("holds checkout stock for Stripe's 30-minute minimum session life plus a two-minute margin", () => {
    expect(CHECKOUT_SESSION_LIFETIME_SECONDS).toBe(32 * 60)
  })

  it("names every webhook event exactly as Stripe emits it", () => {
    expect(Object.values(STRIPE_WEBHOOK_EVENTS)).toStrictEqual([
      "charge.dispute.closed",
      "charge.dispute.created",
      "charge.refunded",
      "checkout.session.async_payment_failed",
      "checkout.session.async_payment_succeeded",
      "checkout.session.completed",
      "checkout.session.expired",
      "payment_intent.payment_failed",
    ])
  })

  it("subscribes to both outcomes of a delayed payment", () => {
    expect(STRIPE_WEBHOOK_EVENTS.CHECKOUT_SESSION_ASYNC_PAYMENT_SUCCEEDED).toBe("checkout.session.async_payment_succeeded")
    expect(STRIPE_WEBHOOK_EVENTS.CHECKOUT_SESSION_ASYNC_PAYMENT_FAILED).toBe("checkout.session.async_payment_failed")
  })
})
