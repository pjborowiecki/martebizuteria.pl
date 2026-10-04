import { type APIRequestContext } from "@playwright/test"
import { z } from "zod"

import { expect } from "./test"

const checkoutSessionsSchema = z.array(
  z.object({
    amount_total: z.number(),
    id: z.string(),
    metadata: z.record(z.string(), z.string()),
    return_url: z.string(),
    status: z.string(),
  }),
)

const signedEventSchema = z.object({ payload: z.string(), signature: z.string() })

const setupIntentsSchema = z.array(z.object({ id: z.string(), status: z.string() }))

export type CheckoutSession = z.infer<typeof checkoutSessionsSchema>[number]

const openSessions = async (request: APIRequestContext, email: string): Promise<CheckoutSession[]> => {
  const response = await request.get("/__test/stripe/checkout-sessions", { params: { email } }).catch(() => undefined)
  if (response === undefined) {
    return []
  }

  expect(response.ok()).toBe(true)

  return checkoutSessionsSchema.parse(await response.json()).filter((session) => session.status === "open")
}

export const waitForOpenCheckoutSession = async (request: APIRequestContext, email: string): Promise<CheckoutSession> => {
  await expect
    .poll(async () => (await openSessions(request, email)).length, { message: `Waiting for a Stripe session for ${email}` })
    .toBeGreaterThan(0)
  const session = (await openSessions(request, email)).at(-1)
  if (session === undefined) {
    throw new Error(`No open Stripe session for ${email}`)
  }

  return session
}

export const completeCheckoutSession = async (request: APIRequestContext, sessionId: string): Promise<void> => {
  const signing = await request.post(`/__test/stripe/checkout-sessions/${sessionId}/complete`)
  expect(signing.ok()).toBe(true)
  const { payload, signature } = signedEventSchema.parse(await signing.json())
  const webhook = await request.post("/api/webhooks/stripe", {
    data: payload,
    headers: { "content-type": "application/json", "stripe-signature": signature },
  })
  expect(webhook.status(), await webhook.text()).toBe(200)
}

const openSetupIntents = async (request: APIRequestContext, email: string): Promise<string[]> => {
  const response = await request.get("/__test/stripe/setup-intents", { params: { email } })
  expect(response.ok()).toBe(true)

  return setupIntentsSchema
    .parse(await response.json())
    .filter((intent) => intent.status === "requires_payment_method")
    .map((intent) => intent.id)
}

export const waitForCardSetupIntent = async (request: APIRequestContext, email: string): Promise<string> => {
  await expect
    .poll(async () => (await openSetupIntents(request, email)).length, { message: `Waiting for a card setup intent for ${email}` })
    .toBeGreaterThan(0)
  const setupIntentId = (await openSetupIntents(request, email)).at(-1)
  if (setupIntentId === undefined) {
    throw new Error(`No open card setup intent for ${email}`)
  }

  return setupIntentId
}

export const confirmCardSetupIntent = async (request: APIRequestContext, setupIntentId: string): Promise<void> => {
  const response = await request.post(`/__test/stripe/setup-intents/${setupIntentId}/succeed`)
  expect(response.ok()).toBe(true)
}
