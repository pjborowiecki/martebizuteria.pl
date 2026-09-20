import {
  type CheckoutEmailContext,
  type OrderAccountCta,
  buildOrderAccountCta,
  formatEmailAddress,
} from "~/src/integrations/resend/order-confirmation.utils"
import { getEmailMessages } from "~/src/integrations/use-intl/i18n.emails"
import { type Locale } from "~/src/integrations/use-intl/i18n.types"

import { type OrderShippedDetails } from "~/src/presentation/emails/order-shipped"
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
const resolveEstimatedDelivery = (deliveryType: "courier" | "in_store" | "locker", locale: Locale): string =>
  getEmailMessages(locale).emails.orderConfirmation.deliveryTiming[deliveryType].estimatedDelivery

export const buildOrderShippedDetails = (context: CheckoutEmailContext | undefined, locale: Locale): OrderShippedDetails => {
  const t = getEmailMessages(locale).emails.orderConfirmation
  const deliveryType = context?.deliveryMethod?.type ?? "courier"
  return {
    deliveryMethod: resolveDeliveryMethodLabel(context, locale),
    estimatedDelivery: resolveEstimatedDelivery(deliveryType, locale),
    shippingAddress: formatEmailAddress(context?.shippingAddress) ?? t.unavailable,
  }
}
export const buildOrderShippedAccountCta = (locale: Locale, orderId: string, userId: string | null | undefined): OrderAccountCta =>
  buildOrderAccountCta(locale, orderId, userId === null || userId === undefined || userId === "")
