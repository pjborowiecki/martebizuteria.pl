import type Stripe from "stripe"

import { stripe } from "~/src/integrations/stripe/stripe.server"
import { resolveStripeObjectId } from "~/src/integrations/stripe/stripe.utils"
import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type FulfillmentLine } from "~/src/modules/checkout/checkout.utils"
import { type OrderLineFulfillmentTime, describeOrderFulfillmentTime } from "~/src/modules/order/order.fulfillment-time.utils"

import { PLACEHOLDER_IMAGE } from "~/src/lib/image"
import { buildLocalizedUrl } from "~/src/lib/seo"
import { resolveAssetURL } from "~/src/lib/url"

import type orderConfirmationMessages from "~/messages/en-US/emails.order-confirmation.json"
import type orderShippedMessages from "~/messages/en-US/emails.order-shipped.json"
import {
  type OrderConfirmationDetails,
  type OrderConfirmationItem,
  type OrderConfirmationLegalLinks,
} from "~/src/presentation/emails/order-confirmation"
import { type OrderShippedDetails } from "~/src/presentation/emails/order-shipped"
import { ROUTES } from "~/src/routes"

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

export const resolveDeliveryMethodLabel = (
  context: Pick<CheckoutEmailContext, "deliveryMethod" | "lockerId"> | undefined,
  unavailable: string,
): string => {
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

const isPresent = (value: string | null): value is string => value !== null && value.trim() !== ""

export const describeCompanyInvoice = (
  { billingCompanyName, billingNip }: Readonly<Pick<CheckoutEmailContext, "billingCompanyName" | "billingNip">>,
  nipLabel: string,
): string | undefined => {
  const lines = [
    ...(isPresent(billingCompanyName) ? [billingCompanyName] : []),
    ...(isPresent(billingNip) ? [`${nipLabel} ${billingNip}`] : []),
  ]

  return lines.length === EMPTY_COUNT ? undefined : lines.join("\n")
}

const resolveBillingAddress = (context: CheckoutEmailContext | undefined, messages: OrderConfirmationMessages): string => {
  if (context === undefined) {
    return messages.unavailable
  }

  if (context.billingAddressId !== null && context.billingAddressId === context.shippingAddressId) {
    return messages.billingSameAsShipping
  }

  return formatEmailAddress(context.billingAddress) ?? messages.unavailable
}

export const buildOrderConfirmationDetails = ({
  context,
  fulfillmentTimes,
  messages,
  paymentMethod,
}: Readonly<OrderConfirmationDetailsInput>): OrderConfirmationDetails => {
  const deliveryType = context?.deliveryMethod?.type ?? "courier"

  return {
    billingAddress: resolveBillingAddress(context, messages),
    companyInvoice: context === undefined ? undefined : describeCompanyInvoice(context, messages.nipLabel),
    deliveryMethod: resolveDeliveryMethodLabel(context, messages.unavailable),
    estimatedDelivery: messages.estimatedDelivery[deliveryType],
    fulfillmentTime: describeOrderFulfillmentTime(fulfillmentTimes, messages),
    paymentMethod,
    shippingAddress: formatEmailAddress(context?.shippingAddress) ?? messages.unavailable,
  }
}

const resolveProductUrl = (origin: string, locale: SupportedLocale, handle: string | undefined): string => {
  const productPath = handle !== undefined && handle !== "" ? ROUTES.PRODUCT.replace("$handle", handle) : ROUTES.PRODUCTS

  return buildLocalizedUrl(origin, productPath, locale)
}

export const buildOrderConfirmationItems = (
  lines: readonly FulfillmentLine[],
  locale: SupportedLocale,
  origin: string,
): OrderConfirmationItem[] =>
  lines.map((line) => ({
    imageUrl: line.imageUrl !== undefined && line.imageUrl !== "" ? resolveAssetURL(line.imageUrl) : PLACEHOLDER_IMAGE,
    price: line.price,
    productUrl: resolveProductUrl(origin, locale, line.handle),
    qty: line.qty,
    title: line.title,
  }))

export const buildOrderAccountCta = ({ isGuest, locale, messages, orderId, origin }: Readonly<OrderAccountCtaInput>): OrderAccountCta => {
  if (isGuest) {
    return {
      href: buildLocalizedUrl(origin, ROUTES.AUTH_SIGN_UP, locale),
      isGuest: true,
      label: messages.createAccountCta,
    }
  }

  const orderPath = ROUTES.ACCOUNT_ORDER.replace("$id", orderId)

  return {
    href: buildLocalizedUrl(origin, orderPath, locale),
    isGuest: false,
    label: messages.viewOrderCta,
  }
}

export const buildOrderLegalLinks = (origin: string, locale: SupportedLocale, orderNumber: string): OrderConfirmationLegalLinks => ({
  exchangesAndReturns: buildLocalizedUrl(origin, ROUTES.EXCHANGES_AND_RETURNS, locale),
  privacyPolicy: buildLocalizedUrl(origin, ROUTES.PRIVACY_POLICY, locale),
  termsOfService: buildLocalizedUrl(origin, ROUTES.TERMS_OF_SERVICE, locale),
  withdrawal: `${buildLocalizedUrl(origin, ROUTES.WITHDRAW_FROM_CONTRACT, locale)}?${new URLSearchParams({ order: orderNumber }).toString()}`,
})

export const buildOrderShippedDetails = (
  context: CheckoutEmailContext | undefined,
  messages: typeof orderShippedMessages,
  tracking?: Readonly<{ trackingNumber: string | null; trackingUrl: string | null }>,
): OrderShippedDetails => {
  const deliveryType = context?.deliveryMethod?.type ?? "courier"
  const trackingNumber = tracking?.trackingNumber?.trim()
  const trackingUrl = tracking?.trackingUrl?.trim()

  return {
    deliveryMethod: resolveDeliveryMethodLabel(context, messages.unavailable),
    estimatedDelivery: messages.deliveryTiming[deliveryType].estimatedDelivery,
    shippingAddress: formatEmailAddress(context?.shippingAddress) ?? messages.unavailable,
    trackingNumber: trackingNumber === undefined || trackingNumber === "" ? undefined : trackingNumber,
    trackingUrl: trackingUrl === undefined || trackingUrl === "" ? undefined : trackingUrl,
  }
}

export const buildOrderShippedAccountCta = ({
  locale,
  messages,
  orderId,
  origin,
  userId,
}: Readonly<{
  locale: SupportedLocale
  messages: typeof orderShippedMessages
  orderId: string
  origin: string
  userId: string | null | undefined
}>): OrderAccountCta =>
  buildOrderAccountCta({ isGuest: userId === null || userId === undefined || userId === "", locale, messages, orderId, origin })

export const resolveStripePaymentMethodLabel = async (
  session: Stripe.Checkout.Session,
  messages: OrderConfirmationMessages,
): Promise<string> => {
  const labels = messages.paymentMethods
  const fallback = messages.paymentMethodUnknown
  const paymentIntentId = resolveStripeObjectId(session.payment_intent)
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

type OrderConfirmationMessages = typeof orderConfirmationMessages

interface OrderConfirmationDetailsInput {
  readonly context: CheckoutEmailContext | undefined
  readonly fulfillmentTimes: readonly OrderLineFulfillmentTime[]
  readonly messages: OrderConfirmationMessages
  readonly paymentMethod: string
}

export interface OrderAccountCtaInput {
  readonly isGuest: boolean
  readonly locale: SupportedLocale
  readonly messages: {
    readonly createAccountCta: string
    readonly viewOrderCta: string
  }
  readonly orderId: string
  readonly origin: string
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
  readonly billingCompanyName: string | null
  readonly billingNip: string | null
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
