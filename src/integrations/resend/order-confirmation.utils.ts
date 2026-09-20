import { env } from "cloudflare:workers"

import type Stripe from "stripe"

import { stripe } from "~/src/integrations/stripe/stripe.server"
import { getEmailMessages } from "~/src/integrations/use-intl/i18n.emails"
import { type Locale } from "~/src/integrations/use-intl/i18n.types"

import { type FulfillmentLine } from "~/src/modules/checkout/checkout.utils"

import { PLACEHOLDER_IMAGE } from "~/src/lib/image"
import { buildLocalizedUrl } from "~/src/lib/sitemap"
import { getBaseURL, resolveAssetURL } from "~/src/lib/url"

import { type OrderConfirmationDetails, type OrderConfirmationItem } from "~/src/presentation/emails/order-confirmation"
import { ROUTES } from "~/src/routes"
const refId = (
  ref:
    | string
    | {
        id: string
      }
    | null
    | undefined,
): string | undefined => {
  if (ref === null || ref === undefined) {
    return undefined
  }
  return typeof ref === "string" ? ref : ref.id
}
export const formatEmailAddress = (addressRow: EmailAddressRow | null | undefined): string | undefined => {
  if (addressRow === null || addressRow === undefined) {
    return undefined
  }
  const name = [addressRow.firstName, addressRow.lastName].filter((part) => part !== null && part !== "").join(" ")
  const locality = [addressRow.postalCode, addressRow.city].filter((part) => part !== null && part !== "").join(" ")
  const lines = [name, addressRow.address1, addressRow.address2, locality, addressRow.countryCode, addressRow.phone].filter(
    (line): line is string => typeof line === "string" && line.trim() !== "",
  )
  return lines.length === EMPTY_COUNT ? undefined : lines.join("\n")
}
const resolveDeliveryMethodLabel = (context: CheckoutEmailContext | undefined, locale: Locale): string => {
  const { unavailable } = getEmailMessages(locale).emails.orderConfirmation
  const method = context?.deliveryMethod
  if (method === null || method === undefined) {
    return unavailable
  }
  const lockerId = context?.lockerId?.trim()
  if (method.type === "locker" && lockerId !== undefined && lockerId !== "") {
    return `${method.name} · ${lockerId}`
  }
  return method.name
}
const resolveDeliveryTiming = (
  deliveryType: "courier" | "locker" | "in_store",
  locale: Locale,
): {
  estimatedDelivery: string
  fulfillmentTime: string
} => {
  const timing = getEmailMessages(locale).emails.orderConfirmation.deliveryTiming
  return timing[deliveryType]
}
const resolveBillingAddress = (context: CheckoutEmailContext | undefined, locale: Locale): string => {
  const t = getEmailMessages(locale).emails.orderConfirmation
  if (context === undefined) {
    return t.unavailable
  }
  if (context.billingAddressId !== null && context.billingAddressId === context.shippingAddressId) {
    return t.billingSameAsShipping
  }
  return formatEmailAddress(context.billingAddress) ?? t.unavailable
}
export const buildOrderConfirmationDetails = (
  context: CheckoutEmailContext | undefined,
  locale: Locale,
  paymentMethod: string,
): OrderConfirmationDetails => {
  const t = getEmailMessages(locale).emails.orderConfirmation
  const deliveryType = context?.deliveryMethod?.type ?? "courier"
  const { estimatedDelivery, fulfillmentTime } = resolveDeliveryTiming(deliveryType, locale)
  return {
    billingAddress: resolveBillingAddress(context, locale),
    deliveryMethod: resolveDeliveryMethodLabel(context, locale),
    estimatedDelivery,
    fulfillmentTime,
    paymentMethod,
    shippingAddress: formatEmailAddress(context?.shippingAddress) ?? t.unavailable,
  }
}
const resolveAppUrl = (): string => {
  if (typeof env.VITE_APP_URL === "string" && env.VITE_APP_URL !== "") {
    return env.VITE_APP_URL.replace(/\/$/u, "")
  }
  return getBaseURL().replace(/\/$/u, "")
}
const resolveProductUrl = (appUrl: string, locale: Locale, handle: string | undefined): string => {
  const productPath = handle !== undefined && handle !== "" ? ROUTES.PRODUCT.replace("$handle", handle) : ROUTES.PRODUCTS
  return buildLocalizedUrl(appUrl, productPath, locale)
}
export const buildOrderConfirmationItems = (lines: readonly FulfillmentLine[], locale: Locale): OrderConfirmationItem[] => {
  const appUrl = resolveAppUrl()
  return lines.map((line) => ({
    imageUrl: line.imageUrl !== undefined && line.imageUrl !== "" ? resolveAssetURL(line.imageUrl) : PLACEHOLDER_IMAGE,
    price: line.price,
    productUrl: resolveProductUrl(appUrl, locale, line.handle),
    qty: line.qty,
    title: line.title,
  }))
}
export const buildOrderAccountCta = (locale: Locale, orderId: string, isGuest: boolean): OrderAccountCta => {
  const appUrl = resolveAppUrl()
  const t = getEmailMessages(locale).emails.orderConfirmation
  if (isGuest) {
    return {
      href: buildLocalizedUrl(appUrl, ROUTES.AUTH_SIGN_UP, locale),
      isGuest: true,
      label: t.createAccountCta,
    }
  }
  const orderPath = ROUTES.ACCOUNT_ORDER.replace("$id", orderId)
  return {
    href: buildLocalizedUrl(appUrl, orderPath, locale),
    isGuest: false,
    label: t.viewOrderCta,
  }
}
export const resolveStripePaymentMethodLabel = async (session: Stripe.Checkout.Session, locale: Locale): Promise<string> => {
  const labels = getEmailMessages(locale).emails.orderConfirmation.paymentMethods
  const fallback = getEmailMessages(locale).emails.orderConfirmation.paymentMethodUnknown
  const paymentIntentId = refId(session.payment_intent)
  if (paymentIntentId === undefined) {
    return fallback
  }
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["payment_method"],
    })
    const paymentMethod = paymentIntent.payment_method
    if (paymentMethod === null || typeof paymentMethod === "string") {
      return fallback
    }
    if (paymentMethod.type === "card") {
      return labels.card
    }
    if (paymentMethod.type === "blik") {
      return labels.blik
    }
    if (paymentMethod.type === "p24") {
      return labels.p24
    }
    return fallback
  } catch {
    return fallback
  }
}
interface EmailAddressRow {
  readonly address1: string
  readonly address2: string | null
  readonly city: string
  readonly countryCode: string
  readonly firstName: string | null
  readonly lastName: string | null
  readonly phone: string | null
  readonly postalCode: string | null
}
export interface CheckoutEmailContext {
  readonly billingAddress: EmailAddressRow | null
  readonly billingAddressId: string | null
  readonly customerNote: string | null
  readonly deliveryMethod: {
    readonly name: string
    readonly type: "courier" | "locker" | "in_store"
  } | null
  readonly lockerId: string | null
  readonly shippingAddress: EmailAddressRow | null
  readonly shippingAddressId: string | null
}
const EMPTY_COUNT = 0
export interface OrderAccountCta {
  readonly href: string
  readonly isGuest: boolean
  readonly label: string
}
