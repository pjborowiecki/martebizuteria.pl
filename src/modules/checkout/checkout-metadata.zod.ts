import type StripeType from "stripe"
import zod from "zod/v4"

import { STRIPE_CURRENCY, STRIPE_METADATA_KEYS_MAX, STRIPE_METADATA_VALUE_LENGTH_MAX } from "~/src/integrations/stripe/stripe.constants"
import { CHECKOUT_ERROR_CODES } from "~/src/integrations/stripe/stripe.errors"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { isSupportedLocale } from "~/src/integrations/use-intl/i18n.paths"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"

const ITEMS_CHUNK_KEY_PREFIX = "items"

const EMPTY_ITEMS_JSON = "[]"

const CHECKOUT_PAYMENT_METADATA_KEYS = ["checkoutId", "deployment", "discountCode", "discountTotal", "locale", "userId"] as const

const CHECKOUT_SESSION_ITEMS_KEYS_MAX = STRIPE_METADATA_KEYS_MAX - CHECKOUT_PAYMENT_METADATA_KEYS.length

const readMetadataValue = (json: string, start: number): string => {
  const value = json.slice(start, start + STRIPE_METADATA_VALUE_LENGTH_MAX)

  return value.isWellFormed() ? value : value.slice(0, -1)
}

const splitIntoMetadataValues = (json: string): string[] => {
  const values: string[] = []
  let start = 0
  while (start < json.length) {
    const value = readMetadataValue(json, start)
    values.push(value)
    start += value.length
  }

  return values
}

export const toCheckoutSessionItemsMetadata = (lines: readonly CheckoutFulfillmentLine[]): Record<string, string> => {
  const chunks = splitIntoMetadataValues(JSON.stringify(lines))
  if (chunks.length > CHECKOUT_SESSION_ITEMS_KEYS_MAX) {
    throw new AppError(ERROR_CODES.VALIDATION, CHECKOUT_ERROR_CODES.CART_TOO_LARGE)
  }

  return Object.fromEntries(chunks.map((chunk, index) => [`${ITEMS_CHUNK_KEY_PREFIX}${index}`, chunk]))
}

export const readCheckoutSessionItemsJson = (metadata: Record<string, string | undefined> | null | undefined): string => {
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

export const parseCheckoutSessionMetadataItems = (itemsJson: string): CheckoutFulfillmentLine[] =>
  checkoutFulfillmentLinesSchema.parse(JSON.parse(itemsJson))

export const parseCheckoutSessionReleaseLines = (itemsJson: string): CheckoutReleaseLine[] =>
  checkoutReleaseLinesSchema.parse(JSON.parse(itemsJson))

export const parseCheckoutSessionFulfillmentLines = (session: StripeType.Checkout.Session): CheckoutFulfillmentLine[] =>
  checkoutFulfillmentLinesSchema.parse(JSON.parse(readCheckoutSessionItemsJson(session.metadata)))

export const resolveCheckoutSessionCurrency = (session: StripeType.Checkout.Session): string =>
  (session.currency ?? STRIPE_CURRENCY).toUpperCase()

export const resolveCheckoutSessionLocale = (session: StripeType.Checkout.Session): SupportedLocale => {
  const raw = session.metadata?.["locale"]

  return typeof raw === "string" && isSupportedLocale(raw) ? raw : I18N.DEFAULT_LOCALE
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

export const checkoutReleaseLinesSchema = zod.array(
  zod
    .object({
      qty: zod.number(),
      variantId: zod.string(),
    })
    .loose(),
)

export type CheckoutFulfillmentLine = zod.infer<typeof checkoutFulfillmentLinesSchema>[number]

export type CheckoutReleaseLine = zod.infer<typeof checkoutReleaseLinesSchema>[number]

export type CheckoutPaymentMetadata = Record<(typeof CHECKOUT_PAYMENT_METADATA_KEYS)[number], string>
