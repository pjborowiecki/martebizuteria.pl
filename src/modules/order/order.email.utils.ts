import type Stripe from "stripe"

import { stripe } from "~/src/integrations/stripe/stripe.server"
import { resolveStripeObjectId } from "~/src/integrations/stripe/stripe.utils"
import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type FulfillmentLine } from "~/src/modules/checkout/checkout.utils"
import { DELIVERY_METHOD } from "~/src/modules/delivery-method/delivery-method.constants"
import { type DeliveryMethod } from "~/src/modules/delivery-method/delivery-method.types"
import { describeOrderLocker, resolveOrderLocker, resolveOrderShippingAddressRow } from "~/src/modules/order/order.detail.utils"
import { formatOrderAddressLocality, resolveOrderTrackingUrl } from "~/src/modules/order/order.display.utils"
import { type OrderLineFulfillmentTime, describeOrderFulfillmentTime } from "~/src/modules/order/order.fulfillment-time.utils"
import { resolveLocalizedString } from "~/src/modules/product-attribute/product-attribute.utils"

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
import { type OrderDeliveredLinks } from "~/src/presentation/emails/order-delivered"
import { type OrderShippedDetails } from "~/src/presentation/emails/order-shipped"
import { ROUTES } from "~/src/routes"

export const formatEmailAddress = (addressRow: EmailAddressRow | null | undefined, locale: SupportedLocale): string | undefined => {
  if (addressRow === null || addressRow === undefined) {
    return undefined
  }

  const name = [addressRow.firstName, addressRow.lastName].filter((part) => part !== null && part !== "").join(" ")
  const locality = formatOrderAddressLocality(addressRow, locale)
  const lines = [name, addressRow.address1, addressRow.address2, locality, addressRow.phone].filter(
    (line): line is string => typeof line === "string" && line.trim() !== "",
  )

  return lines.length === EMPTY_COUNT ? undefined : lines.join("\n")
}

export const resolveDeliveryMethodLabel = (
  deliveryMethod: { readonly names: DeliveryMethod["names"] } | null | undefined,
  { locale, unavailable }: Readonly<{ locale: SupportedLocale; unavailable: string }>,
): string => (deliveryMethod === null || deliveryMethod === undefined ? unavailable : resolveLocalizedString(deliveryMethod.names, locale))

const isFilledLine = (line: string | null | undefined): line is string => typeof line === "string" && line.trim() !== ""

const formatEmailRecipient = (addressRow: EmailAddressRow | null | undefined): string | undefined => {
  const name = [addressRow?.firstName, addressRow?.lastName].filter((part) => isFilledLine(part)).join(" ")
  const lines = [name, addressRow?.phone].filter((line) => isFilledLine(line))

  return lines.length === EMPTY_COUNT ? undefined : lines.join("\n")
}

export const describeEmailDestination = (
  { deliveryMethod, lockerId, lockerPoint, shippingAddress }: Readonly<EmailDestinationSource>,
  unavailable: string,
  locale: SupportedLocale,
): OrderEmailDestination => {
  const locker = resolveOrderLocker({ deliveryType: deliveryMethod?.type, lockerId, lockerPoint })

  return locker === undefined
    ? { address: formatEmailAddress(shippingAddress, locale) ?? unavailable, kind: "address" }
    : { kind: "locker", locker: describeOrderLocker(locker).join("\n"), recipient: formatEmailRecipient(shippingAddress) }
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

const resolveBillingAddress = (
  context: CheckoutEmailContext | undefined,
  messages: OrderConfirmationMessages,
  locale: SupportedLocale,
): string => {
  if (context === undefined) {
    return messages.unavailable
  }

  if (context.billingAddressId !== null && context.billingAddressId === context.shippingAddressId) {
    return messages.billingSameAsShipping
  }

  return formatEmailAddress(context.billingAddress, locale) ?? messages.unavailable
}

export const buildOrderConfirmationDetails = ({
  context,
  fulfillmentTimes,
  locale,
  messages,
  paymentMethod,
}: Readonly<OrderConfirmationDetailsInput>): OrderConfirmationDetails => {
  const deliveryType = context?.deliveryMethod?.type ?? "courier"

  return {
    billingAddress: resolveBillingAddress(context, messages, locale),
    companyInvoice: context === undefined ? undefined : describeCompanyInvoice(context, messages.nipLabel),
    deliveryMethod: resolveDeliveryMethodLabel(context?.deliveryMethod, { locale, unavailable: messages.unavailable }),
    destination:
      context === undefined
        ? { address: messages.unavailable, kind: "address" }
        : describeEmailDestination(context, messages.unavailable, locale),
    estimatedDelivery: messages.estimatedDelivery[deliveryType],
    fulfillmentTime: describeOrderFulfillmentTime(fulfillmentTimes, messages),
    paymentMethod,
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

export const buildOrderDeliveredLinks = (origin: string, locale: SupportedLocale, orderNumber: string): OrderDeliveredLinks => {
  const { exchangesAndReturns, withdrawal } = buildOrderLegalLinks(origin, locale, orderNumber)

  return { care: buildLocalizedUrl(origin, ROUTES.FAQ, locale), exchangesAndReturns, withdrawal }
}

const filledText = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim()

  return trimmed === undefined || trimmed === "" ? undefined : trimmed
}

export const resolveOrderTracking = ({
  deliveryMethod,
  trackingNumber,
  trackingUrl,
}: Readonly<OrderShipmentEmailSource>): OrderTracking => {
  const deliveryType = deliveryMethod?.type

  return {
    carrier: deliveryType === undefined || deliveryType === DELIVERY_METHOD.IN_STORE ? undefined : deliveryMethod?.courier.name,
    trackingNumber: filledText(trackingNumber),
    trackingUrl: resolveOrderTrackingUrl({ courierCode: deliveryMethod?.courier.internalCode, deliveryType, trackingNumber, trackingUrl }),
  }
}

export const toOrderShipmentEmailSource = ({
  addresses,
  checkout,
  deliveryMethod,
  lockerId,
  lockerPoint,
  trackingNumber,
  trackingUrl,
}: Readonly<OrderShipmentEmailRow>): OrderShipmentEmailSource => ({
  deliveryMethod,
  lockerId,
  lockerPoint,
  shippingAddress: resolveOrderShippingAddressRow({ addresses, checkout }),
  trackingNumber: trackingNumber ?? undefined,
  trackingUrl: trackingUrl ?? undefined,
})

export const buildOrderShippedDetails = (
  shipment: Readonly<OrderShipmentEmailSource>,
  messages: typeof orderShippedMessages,
  locale: SupportedLocale,
): OrderShippedDetails => ({
  ...resolveOrderTracking(shipment),
  deliveryMethod: resolveDeliveryMethodLabel(shipment.deliveryMethod, { locale, unavailable: messages.unavailable }),
  destination: describeEmailDestination(shipment, messages.unavailable, locale),
  estimatedDelivery: messages.deliveryTiming[shipment.deliveryMethod?.type ?? "courier"].estimatedDelivery,
})

export const buildOrderShippedAccountCta = ({
  locale,
  messages,
  orderId,
  origin,
  userId,
}: Readonly<{
  locale: SupportedLocale
  messages: OrderAccountCtaInput["messages"]
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
  readonly locale: SupportedLocale
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
  readonly province: string | null
}

export interface OrderShipmentEmailSource {
  readonly deliveryMethod: {
    readonly courier: { readonly internalCode: string; readonly name: string }
    readonly names: DeliveryMethod["names"]
    readonly type: "courier" | "locker" | "in_store"
  } | null
  readonly lockerId: string | null
  readonly lockerPoint: string | null
  readonly shippingAddress: EmailAddressRow | undefined
  readonly trackingNumber: string | undefined
  readonly trackingUrl: string | undefined
}

interface OrderShipmentEmailRow extends Pick<OrderShipmentEmailSource, "deliveryMethod" | "lockerId" | "lockerPoint"> {
  readonly addresses: Parameters<typeof resolveOrderShippingAddressRow>[0]["addresses"]
  readonly checkout: Parameters<typeof resolveOrderShippingAddressRow>[0]["checkout"]
  readonly trackingNumber: string | null
  readonly trackingUrl: string | null
}

export interface OrderTracking {
  readonly carrier: string | undefined
  readonly trackingNumber: string | undefined
  readonly trackingUrl: string | undefined
}

interface EmailDestinationSource {
  readonly deliveryMethod: { readonly type: "courier" | "locker" | "in_store" } | null | undefined
  readonly lockerId: string | null
  readonly lockerPoint: string | null
  readonly shippingAddress: EmailAddressRow | null | undefined
}

export type OrderEmailDestination =
  | { readonly address: string; readonly kind: "address" }
  | { readonly kind: "locker"; readonly locker: string; readonly recipient: string | undefined }

export interface CheckoutEmailContext {
  readonly billingAddress: EmailAddressRow | null
  readonly billingAddressId: string | null
  readonly billingCompanyName: string | null
  readonly billingNip: string | null
  readonly customerNote: string | null
  readonly deliveryMethod: {
    readonly names: DeliveryMethod["names"]
    readonly type: "courier" | "locker" | "in_store"
  } | null
  readonly lockerId: string | null
  readonly lockerPoint: string | null
  readonly shippingAddress: EmailAddressRow | null
  readonly shippingAddressId: string | null
}

const EMPTY_COUNT = 0

export interface OrderAccountCta {
  readonly href: string
  readonly isGuest: boolean
  readonly label: string
}
