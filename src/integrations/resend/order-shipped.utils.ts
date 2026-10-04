import {
  type CheckoutEmailContext,
  type OrderAccountCta,
  buildOrderAccountCta,
  formatEmailAddress,
  resolveDeliveryMethodLabel,
} from "~/src/integrations/resend/order-confirmation.utils"
import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type orderShippedMessages from "~/messages/en-US/emails.order-shipped.json"
import { type OrderShippedDetails } from "~/src/presentation/emails/order-shipped"

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
