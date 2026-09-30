import { type StripeCheckoutElementsValue } from "@stripe/react-stripe-js/checkout"
import { type StripeCheckoutContact } from "@stripe/stripe-js"

import { createCheckoutSessionFn, updateCheckoutSessionFn } from "~/src/integrations/stripe/stripe.actions"

import { type CartItem } from "~/src/modules/cart/cart.store"
import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"

export interface CheckoutSession {
  amount: number
  clientSecret: string
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

interface EnsureSessionArgs {
  amount: number
  existing: CheckoutSession | undefined
  items: CartItem[]
  values: CheckoutFormSchema
}

export const ensureCheckoutSession = async ({ amount, existing, items, values }: EnsureSessionArgs): Promise<CheckoutSession> => {
  const linesFingerprint = buildCheckoutLinesFingerprint(items)
  const valuesFingerprint = buildCheckoutValuesFingerprint(values)

  if (existing === undefined) {
    const created = await createCheckoutSessionFn({
      data: { checkoutValues: values, items },
    })

    return { amount, clientSecret: created.clientSecret, linesFingerprint, sessionId: created.sessionId, valuesFingerprint }
  }

  if (existing.amount !== amount || existing.linesFingerprint !== linesFingerprint || existing.valuesFingerprint !== valuesFingerprint) {
    const updated = await updateCheckoutSessionFn({
      data: { checkoutValues: values, items, sessionId: existing.sessionId },
    })

    return { amount, clientSecret: updated.clientSecret, linesFingerprint, sessionId: updated.sessionId, valuesFingerprint }
  }

  return existing
}

interface ResetSessionArgs {
  amount: number
  items: CartItem[]
  session: CheckoutSession
  values: CheckoutFormSchema
}

export const resetCheckoutSession = async ({ amount, items, session, values }: ResetSessionArgs): Promise<CheckoutSession> => {
  const valuesFingerprint = buildCheckoutValuesFingerprint(values)
  const updated = await updateCheckoutSessionFn({
    data: { checkoutValues: values, items, sessionId: session.sessionId },
  })

  const linesFingerprint = buildCheckoutLinesFingerprint(items)

  return { amount, clientSecret: updated.clientSecret, linesFingerprint, sessionId: updated.sessionId, valuesFingerprint }
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
