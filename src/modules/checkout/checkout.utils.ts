import type StripeType from "stripe"

import { STRIPE_CURRENCY } from "~/src/integrations/stripe/stripe.constants"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { isSupportedLocale } from "~/src/integrations/use-intl/i18n.paths"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { type PendingCheckout } from "~/src/modules/checkout/checkout.types"
import {
  type CheckoutFulfillmentLine,
  checkoutFulfillmentLinesSchema,
  checkoutMetadataMinorUnitsSchema,
} from "~/src/modules/checkout/checkout.zod"

const ITEMS_CHUNK_KEY_PREFIX = "items"

const EMPTY_ITEMS_JSON = "[]"

const readCheckoutSessionItemsJson = (metadata: Record<string, string | undefined> | null | undefined): string => {
  if (metadata === null || metadata === undefined) {
    return EMPTY_ITEMS_JSON
  }

  const legacy = metadata[ITEMS_CHUNK_KEY_PREFIX]
  if (legacy !== undefined && legacy !== "") {
    return legacy
  }

  const chunks: string[] = []
  for (let index = 0; ; index += 1) {
    const chunk = metadata[`${ITEMS_CHUNK_KEY_PREFIX}${index}`]
    if (chunk === undefined) {
      break
    }
    chunks.push(chunk)
  }

  return chunks.length === 0 ? EMPTY_ITEMS_JSON : chunks.join("")
}

export const parseCheckoutSessionFulfillmentLines = (session: StripeType.Checkout.Session): CheckoutFulfillmentLine[] =>
  checkoutFulfillmentLinesSchema.parse(JSON.parse(readCheckoutSessionItemsJson(session.metadata)))

export const resolveCheckoutSessionCurrency = (session: StripeType.Checkout.Session): string =>
  (session.currency ?? STRIPE_CURRENCY).toUpperCase()

export const resolveCheckoutSessionLocale = (session: StripeType.Checkout.Session): SupportedLocale => {
  const raw = session.metadata?.["locale"]

  return typeof raw === "string" && isSupportedLocale(raw) ? raw : I18N.DEFAULT_LOCALE
}

export const resolveCheckoutSessionShippingTotal = (session: StripeType.Checkout.Session): number | undefined => {
  const parsed = checkoutMetadataMinorUnitsSchema.safeParse(session.metadata?.["shippingTotal"])

  return parsed.success ? parsed.data : undefined
}

export const resolveCheckoutSessionDiscountTotal = (session: StripeType.Checkout.Session): number | undefined => {
  const parsed = checkoutMetadataMinorUnitsSchema.safeParse(session.metadata?.["discountTotal"])

  return parsed.success ? parsed.data : undefined
}

export const resolvePendingCheckout = (
  paymentRow: { checkoutId: string; id: string } | undefined,
  checkoutRow: { email: string; status: string; userId: string | null } | undefined,
  transactionId: string,
): PendingCheckout | undefined => {
  if (paymentRow === undefined) {
    throw new AppError(ERROR_CODES.NOT_FOUND, `No payment carries Checkout Session ${transactionId}`)
  }

  if (checkoutRow === undefined) {
    throw new AppError(ERROR_CODES.NOT_FOUND, `Checkout ${paymentRow.checkoutId} no longer exists`)
  }

  if (checkoutRow.status === "completed") {
    console.info(`Checkout ${paymentRow.checkoutId} already completed.`)

    return undefined
  }

  if (checkoutRow.status !== "pending") {
    throw new AppError(ERROR_CODES.NOT_FOUND, `Checkout ${paymentRow.checkoutId} is ${checkoutRow.status}, so it cannot become an order`)
  }

  return { checkoutId: paymentRow.checkoutId, email: checkoutRow.email, paymentId: paymentRow.id, userId: checkoutRow.userId }
}
