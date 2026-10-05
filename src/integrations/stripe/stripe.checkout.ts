import { type StripeCheckoutElementsValue } from "@stripe/react-stripe-js/checkout"
import { type StripeCheckoutContact } from "@stripe/stripe-js"

import { createCheckoutSessionFn, updateCheckoutSessionFn } from "~/src/integrations/stripe/stripe.actions"
import { CHECKOUT_SESSION_LIFETIME_SECONDS } from "~/src/integrations/stripe/stripe.constants"
import { CHECKOUT_ERROR_CODES } from "~/src/integrations/stripe/stripe.errors"

import { type CartItem } from "~/src/modules/cart/cart.store"
import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"

const MILLISECONDS_PER_SECOND = 1000

export interface CheckoutSession {
  amount: number
  clientSecret: string
  expiresAt: number
  linesFingerprint: string
  sessionId: string
  valuesFingerprint: string
}

export const buildCheckoutLinesFingerprint = (items: readonly { qty: number; variantId: string }[]): string =>
  items
    .map((item) => `${item.variantId}:${item.qty}`)
    .toSorted((left, right) => left.localeCompare(right))
    .join("|")

export const buildCheckoutValuesFingerprint = (values: CheckoutFormSchema): string =>
  JSON.stringify(Object.fromEntries(Object.entries(values).toSorted(([left], [right]) => left.localeCompare(right))))

export const buildCheckoutContact = (values: CheckoutFormSchema): StripeCheckoutContact => {
  const useBilling = values.sameAsShipping === false

  return {
    address: {
      city: useBilling ? (values.billingCity ?? "") : values.city,
      country: useBilling ? (values.billingCountryCode ?? "") : values.countryCode,
      line1: useBilling ? (values.billingAddress1 ?? "") : values.address1,
      postal_code: useBilling ? (values.billingPostalCode ?? "") : values.postalCode,
    },
    name: useBilling
      ? `${values.billingFirstName ?? ""} ${values.billingLastName ?? ""}`.trim()
      : `${values.firstName} ${values.lastName}`.trim(),
  }
}

interface CheckoutSessionChange {
  checkoutValues: CheckoutFormSchema
  items: CartItem[]
  sessionId: string
}

const updateOrRestartCheckoutSession = async ({ checkoutValues, items, sessionId }: CheckoutSessionChange) => {
  try {
    return await updateCheckoutSessionFn({ data: { checkoutValues, items, sessionId } })
  } catch (error) {
    if (!(error instanceof Error) || error.message !== CHECKOUT_ERROR_CODES.SESSION_CLOSED) {
      throw error
    }

    return createCheckoutSessionFn({ data: { checkoutValues, items } })
  }
}

interface CheckoutSessionRequest {
  amount: number
  items: CartItem[]
  values: CheckoutFormSchema
}

const toCheckoutSession = (
  opened: Readonly<{ clientSecret: string; sessionId: string }>,
  { amount, items, values }: CheckoutSessionRequest,
): CheckoutSession => ({
  amount,
  clientSecret: opened.clientSecret,
  expiresAt: Date.now() + CHECKOUT_SESSION_LIFETIME_SECONDS * MILLISECONDS_PER_SECOND,
  linesFingerprint: buildCheckoutLinesFingerprint(items),
  sessionId: opened.sessionId,
  valuesFingerprint: buildCheckoutValuesFingerprint(values),
})

interface EnsureSessionArgs extends CheckoutSessionRequest {
  existing: CheckoutSession | undefined
  heldSessionId: string | undefined
}

const matchesRequest = (session: CheckoutSession, { amount, items, values }: CheckoutSessionRequest): boolean =>
  session.amount === amount &&
  session.linesFingerprint === buildCheckoutLinesFingerprint(items) &&
  session.valuesFingerprint === buildCheckoutValuesFingerprint(values)

export const ensureCheckoutSession = async ({ existing, heldSessionId, ...request }: EnsureSessionArgs): Promise<CheckoutSession> => {
  const continuedSessionId = heldSessionId ?? existing?.sessionId
  if (continuedSessionId === undefined) {
    return toCheckoutSession(await createCheckoutSessionFn({ data: { checkoutValues: request.values, items: request.items } }), request)
  }

  if (existing?.sessionId === continuedSessionId && matchesRequest(existing, request)) {
    return existing
  }

  const continued = await updateOrRestartCheckoutSession({
    checkoutValues: request.values,
    items: request.items,
    sessionId: continuedSessionId,
  })

  return toCheckoutSession(continued, request)
}

interface ResetSessionArgs extends CheckoutSessionRequest {
  heldSessionId: string | undefined
  session: CheckoutSession
}

export const resetCheckoutSession = async ({ heldSessionId, session, ...request }: ResetSessionArgs): Promise<CheckoutSession> => {
  const updated = await updateOrRestartCheckoutSession({
    checkoutValues: request.values,
    items: request.items,
    sessionId: heldSessionId ?? session.sessionId,
  })

  return toCheckoutSession(updated, request)
}

const PAYMENT_FAILED_CODE = "paymentFailed"

export type ConfirmOutcome = { status: "success" } | { status: "error"; message: string; recoverable: boolean }

export const confirmCheckoutSession = async ({
  checkout,
  values,
}: Readonly<{ checkout: StripeCheckoutElementsValue; values: CheckoutFormSchema }>): Promise<ConfirmOutcome> => {
  const result = await checkout.confirm({
    billingAddress: buildCheckoutContact(values),
    redirect: "if_required",
  })

  if (result.type === "error") {
    return {
      message: result.error.message,
      recoverable: result.error.code !== PAYMENT_FAILED_CODE,
      status: "error",
    }
  }

  return { status: "success" }
}
