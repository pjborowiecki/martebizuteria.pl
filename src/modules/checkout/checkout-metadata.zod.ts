import type StripeType from "stripe"
import zod from "zod/v4"

import { STRIPE_CURRENCY } from "~/src/integrations/stripe/stripe.constants"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { isSupportedLocale } from "~/src/integrations/use-intl/i18n.paths"

const ITEMS_CHUNK_KEY_PREFIX = "items"

const EMPTY_ITEMS_JSON = "[]"

const CHECKOUT_PAYMENT_METADATA_KEYS = [
  "checkoutId",
  "deployment",
  "discountCode",
  "discountTotal",
  "locale",
  "shippingTotal",
  "userId",
] as const

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

const minorUnitsSchema = zod.string().regex(/^\d+$/u).transform(Number)

export const resolveCheckoutSessionShippingTotal = (session: StripeType.Checkout.Session): number | undefined => {
  const parsed = minorUnitsSchema.safeParse(session.metadata?.["shippingTotal"])

  return parsed.success ? parsed.data : undefined
}

export const resolveCheckoutSessionDiscountTotal = (session: StripeType.Checkout.Session): number | undefined => {
  const parsed = minorUnitsSchema.safeParse(session.metadata?.["discountTotal"])

  return parsed.success ? parsed.data : undefined
}

export const checkoutFulfillmentLinesSchema = zod.array(
  zod.object({
    handle: zod.string().optional(),
    imageUrl: zod.string().optional(),
    price: zod.number(),
    qty: zod.number(),
    title: zod.string(),
    variantId: zod.string(),
  }),
)

export type CheckoutFulfillmentLine = zod.infer<typeof checkoutFulfillmentLinesSchema>[number]

export type CheckoutPaymentMetadata = Record<(typeof CHECKOUT_PAYMENT_METADATA_KEYS)[number], string>
