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
): OrderShippedDetails => {
  const deliveryType = context?.deliveryMethod?.type ?? "courier"

  return {
    deliveryMethod: resolveDeliveryMethodLabel(context, messages.unavailable),
    estimatedDelivery: messages.deliveryTiming[deliveryType].estimatedDelivery,
    shippingAddress: formatEmailAddress(context?.shippingAddress) ?? messages.unavailable,
  }
}

export const buildOrderShippedAccountCta = ({
  locale,
  messages,
  orderId,
  userId,
}: Readonly<{
  locale: SupportedLocale
  messages: typeof orderShippedMessages
  orderId: string
  userId: string | null | undefined
}>): OrderAccountCta =>
  buildOrderAccountCta({ isGuest: userId === null || userId === undefined || userId === "", locale, messages, orderId })
