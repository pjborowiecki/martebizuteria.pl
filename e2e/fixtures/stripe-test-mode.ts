import { type APIRequestContext } from "@playwright/test"
import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"
import Stripe from "stripe"

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
  connectStripe().checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] })
