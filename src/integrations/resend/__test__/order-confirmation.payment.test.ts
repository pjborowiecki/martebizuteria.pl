import type Stripe from "stripe"
import { describe, expect, it, vi } from "vite-plus/test"

const { paymentIntentsRetrieve } = vi.hoisted(() => ({
  paymentIntentsRetrieve: vi.fn(),
}))

vi.mock("~/src/integrations/stripe/stripe.server", () => ({
  stripe: { paymentIntents: { retrieve: paymentIntentsRetrieve } },
}))
vi.mock("~/src/lib/image", () => ({ PLACEHOLDER_IMAGE: "https://assets.test/placeholder.svg" }))
vi.mock("~/src/lib/url", () => ({
  getBaseURL: () => "https://fallback.test/",
  resolveAssetURL: (src: string) => `https://assets.test/${src}`,
}))

import {
  buildOrderAccountCta,
  buildOrderConfirmationItems,
  resolveStripePaymentMethodLabel,
} from "~/src/integrations/resend/order-confirmation.utils"
import { paymentIntent } from "~/src/integrations/stripe/__test__/fixtures/stripe-webhook-events"

import englishCopy from "~/messages/en-US/emails.order-confirmation.json"

const checkoutSession = (intent: Stripe.Checkout.Session["payment_intent"]): Stripe.Checkout.Session => ({
  adaptive_pricing: null,
  after_expiration: null,
  allow_promotion_codes: null,
  amount_subtotal: 12_000,
  amount_total: 12_000,
  automatic_tax: { enabled: false, liability: null, provider: null, status: null },
  billing_address_collection: null,
  cancel_url: null,
  client_reference_id: null,
  client_secret: null,
  collected_information: null,
  consent: null,
  consent_collection: null,
  created: 0,
  currency: "pln",
  currency_conversion: null,
  custom_fields: [],
  custom_text: { after_submit: null, shipping_address: null, submit: null, terms_of_service_acceptance: null },
  customer: null,
  customer_account: null,
  customer_creation: null,
  customer_details: null,
  customer_email: null,
  discounts: null,
  expires_at: 0,
  id: "cs_test_1",
  integration_identifier: null,
  invoice: null,
  invoice_creation: null,
  livemode: false,
  locale: null,
  managed_payments: null,
  metadata: null,
  mode: "payment",
  object: "checkout.session",
  origin_context: null,
  payment_intent: intent,
  payment_link: null,
  payment_method_collection: null,
  payment_method_configuration_details: null,
  payment_method_options: null,
  payment_method_types: ["card"],
  payment_status: "paid",
  permissions: null,
  recovered_from: null,
  saved_payment_method_options: null,
  setup_intent: null,
  shipping_address_collection: null,
  shipping_cost: null,
  shipping_options: [],
  status: "complete",
  submit_type: null,
  subscription: null,
  success_url: null,
  total_details: null,
  ui_mode: null,
  url: null,
  wallet_options: null,
})

describe("resolveStripePaymentMethodLabel", () => {
  it("reports the unknown label when the session carries no payment intent", async () => {
    await expect(resolveStripePaymentMethodLabel(checkoutSession(null), englishCopy)).resolves.toBe(englishCopy.paymentMethodUnknown)
    expect(paymentIntentsRetrieve).not.toHaveBeenCalled()
  })

  it("expands the payment method on the intent it was given", async () => {
    paymentIntentsRetrieve.mockResolvedValueOnce({ payment_method: { type: "card" } })

    await resolveStripePaymentMethodLabel(checkoutSession("pi_1"), englishCopy)

    expect(paymentIntentsRetrieve).toHaveBeenCalledWith("pi_1", { expand: ["payment_method"] })
  })

  it("resolves the payment method when Stripe already expanded the session's payment intent", async () => {
    const intent = paymentIntent({ id: "pi_expanded" })
    paymentIntentsRetrieve.mockResolvedValueOnce({ payment_method: { type: "blik" } })

    await expect(resolveStripePaymentMethodLabel(checkoutSession(intent), englishCopy)).resolves.toBe(englishCopy.paymentMethods.blik)

    expect(paymentIntentsRetrieve).toHaveBeenLastCalledWith("pi_expanded", { expand: ["payment_method"] })
  })

  it.each([
    ["card", englishCopy.paymentMethods.card],
    ["blik", englishCopy.paymentMethods.blik],
    ["p24", englishCopy.paymentMethods.p24],
  ])("labels a %s payment", async (type, expected) => {
    paymentIntentsRetrieve.mockResolvedValueOnce({ payment_method: { type } })

    await expect(resolveStripePaymentMethodLabel(checkoutSession("pi_1"), englishCopy)).resolves.toBe(expected)
  })

  it("reports the unknown label for a payment method type it does not translate", async () => {
    paymentIntentsRetrieve.mockResolvedValueOnce({ payment_method: { type: "sepa_debit" } })

    await expect(resolveStripePaymentMethodLabel(checkoutSession("pi_1"), englishCopy)).resolves.toBe(englishCopy.paymentMethodUnknown)
  })

  it.each([[null], ["pm_1"]])("reports the unknown label when the payment method came back as %j", async (paymentMethod) => {
    paymentIntentsRetrieve.mockResolvedValueOnce({ payment_method: paymentMethod })

    await expect(resolveStripePaymentMethodLabel(checkoutSession("pi_1"), englishCopy)).resolves.toBe(englishCopy.paymentMethodUnknown)
  })

  it("reports the unknown label when Stripe rejects the lookup", async () => {
    paymentIntentsRetrieve.mockRejectedValueOnce(new Error("network"))

    await expect(resolveStripePaymentMethodLabel(checkoutSession("pi_1"), englishCopy)).resolves.toBe(englishCopy.paymentMethodUnknown)
  })
})

describe("link origin", () => {
  const origin = "https://martebizuteria-preview.pjborowiecki.workers.dev"

  it("builds the guest sign-up cta from the origin it is given", () => {
    expect(buildOrderAccountCta({ isGuest: true, locale: "en-US", messages: englishCopy, orderId: "order-1", origin }).href).toBe(
      `${origin}/en-US/auth/sign-up`,
    )
  })

  it("builds product urls from the origin it is given without a doubled slash", () => {
    expect(
      buildOrderConfirmationItems([{ handle: "ring", price: 1, qty: 1, title: "Ring", variantId: "v1" }], "en-US", origin)[0]?.productUrl,
    ).toBe(`${origin}/en-US/products/ring`)
  })
})
