import { type StripeCheckoutElementsValue } from "@stripe/react-stripe-js/checkout"
import { type StripeCheckoutContact } from "@stripe/stripe-js"

import { createCheckoutSessionFn, updateCheckoutSessionFn } from "~/src/integrations/stripe/stripe.actions"
import { ProcessingCheckoutSessionError } from "~/src/integrations/stripe/stripe.checkout.processing"
import { CHECKOUT_SESSION_LIFETIME_SECONDS } from "~/src/integrations/stripe/stripe.constants"
import { CHECKOUT_ERROR_CODES } from "~/src/integrations/stripe/stripe.errors"

import { type CartUnitPrice, getCartLineUnitPriceCents } from "~/src/modules/cart/cart.pricing"
import { type CartItem } from "~/src/modules/cart/cart.store"
import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"
import { type OrderTotals } from "~/src/modules/order/order.totals"

const MILLISECONDS_PER_SECOND = 1000

export interface CheckoutSessionLine extends CartUnitPrice {
  readonly qty: number
}

export interface CheckoutSession {
  clientSecret: string
  expiresAt: number
  lines: readonly CheckoutSessionLine[]
  sessionId: string
  totals: OrderTotals
  valuesFingerprint: string
}

export const buildCheckoutLinesFingerprint = (lines: readonly CheckoutSessionLine[]): string =>
  lines
    .map((line) => `${line.variantId}:${line.qty}:${line.unitPrice}`)
    .toSorted((left, right) => left.localeCompare(right))
    .join("|")

const toCheckoutSessionLines = (items: readonly CartItem[]): CheckoutSessionLine[] =>
  items.map((item) => ({ qty: item.qty, unitPrice: getCartLineUnitPriceCents(item), variantId: item.variantId }))

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

export class PaidCheckoutSessionError extends Error {
  readonly sessionId: string

  constructor(sessionId: string) {
    super(CHECKOUT_ERROR_CODES.SESSION_COMPLETE)
    this.name = "PaidCheckoutSessionError"
    this.sessionId = sessionId
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
    const code = error instanceof Error ? error.message : undefined
    if (code === CHECKOUT_ERROR_CODES.SESSION_COMPLETE) {
      throw new PaidCheckoutSessionError(sessionId)
    }

    if (code === CHECKOUT_ERROR_CODES.SESSION_PROCESSING) {
      throw new ProcessingCheckoutSessionError(sessionId)
    }

    if (code !== CHECKOUT_ERROR_CODES.SESSION_CLOSED) {
      throw error
    }

    return createCheckoutSessionFn({ data: { checkoutValues, items } })
  }
}

interface CheckoutSessionRequest {
  items: CartItem[]
  values: CheckoutFormSchema
}

type OpenedCheckoutSession = Awaited<ReturnType<typeof createCheckoutSessionFn>>

const toCheckoutSession = (opened: Readonly<OpenedCheckoutSession>, values: CheckoutFormSchema): CheckoutSession => ({
  clientSecret: opened.clientSecret,
  expiresAt: Date.now() + CHECKOUT_SESSION_LIFETIME_SECONDS * MILLISECONDS_PER_SECOND,
  lines: opened.lines,
  sessionId: opened.sessionId,
  totals: opened.totals,
  valuesFingerprint: buildCheckoutValuesFingerprint(values),
})

export const isCheckoutSessionFor = (session: CheckoutSession, { items, values }: Readonly<CheckoutSessionRequest>): boolean =>
  buildCheckoutLinesFingerprint(session.lines) === buildCheckoutLinesFingerprint(toCheckoutSessionLines(items)) &&
  session.valuesFingerprint === buildCheckoutValuesFingerprint(values)

interface EnsureSessionArgs extends CheckoutSessionRequest {
  existing: CheckoutSession | undefined
  heldSessionId: string | undefined
}

export const ensureCheckoutSession = async ({ existing, heldSessionId, ...request }: EnsureSessionArgs): Promise<CheckoutSession> => {
  const continuedSessionId = heldSessionId ?? existing?.sessionId
  if (continuedSessionId === undefined) {
    return toCheckoutSession(
      await createCheckoutSessionFn({ data: { checkoutValues: request.values, items: request.items } }),
      request.values,
    )
  }

  if (existing?.sessionId === continuedSessionId && isCheckoutSessionFor(existing, request)) {
    return existing
  }

  const continued = await updateOrRestartCheckoutSession({
    checkoutValues: request.values,
    items: request.items,
    sessionId: continuedSessionId,
  })

  return toCheckoutSession(continued, request.values)
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

  return toCheckoutSession(updated, request.values)
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
