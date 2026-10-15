import { type APIRequestContext, type Page } from "@playwright/test"
import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"
import Stripe from "stripe"

import { COURIER, PRODUCTS, SHIPPING_ADDRESS } from "../data/catalog"
import { type CheckoutPage } from "../pages/checkout-page"
import { type ProductPage } from "../pages/product-page"
import { heldCheckoutSessionId, waitForHeldCheckoutSessionId } from "./checkout-draft"
import { deliverStripeEvent } from "./stripe"
import { expect } from "./test"

const COMPLETED = "checkout.session.completed"

const RECENT_EVENTS_SECONDS = 600

const MILLISECONDS_PER_SECOND = 1000

const EVENTS_PAGE_SIZE = 100

const STRIPE_EVENT_TIMEOUT_MS = 60_000

const dummyEnvironment = parseEnv(readFileSync(".env.test", "utf8"))

const holdsStripeTestModeKey = (name: string, prefixes: readonly string[]): boolean => {
  const value = process.env[name]

  return value !== undefined && value !== dummyEnvironment[name] && prefixes.some((prefix) => value.startsWith(prefix))
}

export const HAS_STRIPE_TEST_MODE_KEYS =
  holdsStripeTestModeKey("STRIPE_SECRET_KEY", ["sk_test_", "rk_test_"]) &&
  holdsStripeTestModeKey("VITE_STRIPE_PUBLISHABLE_KEY", ["pk_test_"])

export const STRIPE_TEST_MODE_SKIP_REASON =
  "No Stripe test-mode keys: build the test Worker and run this project with STRIPE_SECRET_KEY (sk_test_ or rk_test_) and VITE_STRIPE_PUBLISHABLE_KEY (pk_test_) from a Stripe sandbox. Without them no spec calls Stripe."

export const STRIPE_ORIGINS = /^https:\/\/(?:[\w-]+\.)*(?:stripe\.com|stripe\.network|stripecdn\.com|hcaptcha\.com)\//u

export const STRIPE_TEST_CARD = { cvc: "123", expiry: "12/34", number: "4242424242424242" } as const

export const STRIPE_THREE_D_SECURE_CARD = { ...STRIPE_TEST_CARD, number: "4000002760003184" } as const

export const STRIPE_TEST_BLIK_CODE = "123456"

export const STRIPE_DECLINED_CARDS = [
  {
    card: { ...STRIPE_TEST_CARD, number: "4000000000000002" },
    error: { code: "card_declined", decline_code: "generic_decline" },
    message: "Your card has been declined.",
    reason: "a generic decline",
  },
  {
    card: { ...STRIPE_TEST_CARD, number: "4000000000009995" },
    error: { code: "card_declined", decline_code: "insufficient_funds" },
    message: "Your card has insufficient funds.",
    reason: "insufficient funds",
  },
  {
    card: { ...STRIPE_TEST_CARD, number: "4000000000000069" },
    error: { code: "expired_card" },
    message: "Your card is expired.",
    reason: "an expired card",
  },
  {
    card: { ...STRIPE_TEST_CARD, number: "4000000000000127" },
    error: { code: "incorrect_cvc" },
    message: "CVC is incorrect.",
    reason: "an incorrect CVC",
  },
] as const

export const CONFIRMATION_URL = /\/en-US\/checkout\?(?=.*\bsuccess=true\b)(?=.*\bsession_id=cs_test_\w+)/u

export const ORDER_NUMBER = /MRT-\d{4}-\d{5}/u

export const ORDER_CONFIRMATION_SUBJECT = "Order confirmation — M'Arte"

export const PAYMENT_STEP_URL = /\/en-US\/checkout\?step=4$/u

const SESSION_REPLACED = "This payment session is no longer active."

const STRIPE_OUTCOME_TIMEOUT_MS = 90_000

const connectStripe = (): Stripe => {
  const secretKey = process.env["STRIPE_SECRET_KEY"]
  if (secretKey === undefined) {
    throw new Error(STRIPE_TEST_MODE_SKIP_REASON)
  }

  return new Stripe(secretKey)
}

const webhookSecret = (): string => {
  const secret = process.env["STRIPE_WEBHOOK_SECRET"] ?? dummyEnvironment["STRIPE_WEBHOOK_SECRET"]
  if (secret === undefined) {
    throw new Error("Neither the environment nor .env.test sets the STRIPE_WEBHOOK_SECRET the test Worker verifies events with")
  }

  return secret
}

const completionOf = async (stripe: Stripe, sessionId: string): Promise<Stripe.CheckoutSessionCompletedEvent | undefined> => {
  const { data } = await stripe.events.list({
    created: { gte: Math.floor(Date.now() / MILLISECONDS_PER_SECOND) - RECENT_EVENTS_SECONDS },
    limit: EVENTS_PAGE_SIZE,
    type: COMPLETED,
  })

  return data.find((event): event is Stripe.CheckoutSessionCompletedEvent => event.type === COMPLETED && event.data.object.id === sessionId)
}

export const forwardCheckoutCompletion = async (request: APIRequestContext, sessionId: string): Promise<Stripe.Checkout.Session> => {
  const stripe = connectStripe()
  await expect
    .poll(async () => (await completionOf(stripe, sessionId))?.id, {
      message: `Waiting for Stripe to report ${sessionId} paid`,
      timeout: STRIPE_EVENT_TIMEOUT_MS,
    })
    .toBeDefined()
  const completion = await completionOf(stripe, sessionId)
  if (completion === undefined) {
    throw new Error(`Stripe reported no ${COMPLETED} event for ${sessionId}`)
  }

  const payload = JSON.stringify(completion)
  await deliverStripeEvent(request, { payload, signature: stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret() }) })

  return completion.data.object
}

export const retrieveCheckoutSessionPayment = (sessionId: string): Promise<Stripe.Checkout.Session> =>
  connectStripe().checkout.sessions.retrieve(sessionId, { expand: ["payment_intent.latest_charge"] })

interface PaymentStep {
  readonly checkoutPage: CheckoutPage
  readonly page: Page
}

export const openGuestPaymentStep = async (
  { checkoutPage, page, productPage }: PaymentStep & { readonly productPage: ProductPage },
  email: string,
): Promise<string> => {
  await productPage.gotoProduct(PRODUCTS.lapis.handle)
  await productPage.addToCart()
  await checkoutPage.gotoCheckout()
  await checkoutPage.fillContact(email, SHIPPING_ADDRESS.phone)
  await checkoutPage.fillAddress(SHIPPING_ADDRESS)
  await checkoutPage.chooseDelivery(COURIER.name)
  await expect(checkoutPage.payButton()).toBeVisible()

  return waitForHeldCheckoutSessionId(page)
}

interface PaymentRefusal {
  readonly error: Readonly<Record<string, string>>
  readonly message: string
}

export const expectPaymentRefusedOnSession = async (
  { checkoutPage, page }: PaymentStep,
  sessionId: string,
  { error, message }: PaymentRefusal,
): Promise<void> => {
  await expect(checkoutPage.notification(message)).toBeVisible({ timeout: STRIPE_OUTCOME_TIMEOUT_MS })
  await expect(checkoutPage.notification(SESSION_REPLACED)).toHaveCount(0)
  await expect(page).toHaveURL(PAYMENT_STEP_URL)
  await expect(checkoutPage.payButton()).toBeVisible()
  await expect(checkoutPage.summary()).toContainText(PRODUCTS.lapis.title)
  expect(await heldCheckoutSessionId(page)).toBe(sessionId)
  expect(await retrieveCheckoutSessionPayment(sessionId)).toMatchObject({
    payment_intent: { last_payment_error: error, status: "requires_payment_method" },
    status: "open",
  })
}

export const expectOrderPaidOnSession = async ({ checkoutPage, page }: PaymentStep, sessionId: string): Promise<void> => {
  await expect(page).toHaveURL(CONFIRMATION_URL, { timeout: STRIPE_OUTCOME_TIMEOUT_MS })
  expect(new URL(page.url()).searchParams.get("session_id")).toBe(sessionId)
  await expect(checkoutPage.confirmationHeading()).toBeVisible()
  await expect(page.getByRole("main")).toContainText(ORDER_NUMBER)
}
