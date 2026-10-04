import { createElement } from "react"

import { createTranslator } from "use-intl"

import { type CheckoutEmailContext } from "~/src/integrations/resend/order-confirmation.utils"
import { type OrderEmailOutcome, recordOrderEmailAttempt } from "~/src/integrations/resend/order-email.outcome.server"
import { buildOrderShippedAccountCta, buildOrderShippedDetails } from "~/src/integrations/resend/order-shipped.utils"
import { sendEmail } from "~/src/integrations/resend/resend.send"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { getCheckoutEmailContext } from "~/src/modules/checkout/checkout.accessors"
import { getOrderForShippedEmail } from "~/src/modules/order/order.accessors"
import { resolveOrderLocale } from "~/src/modules/order/order.display.utils"

import type orderShippedMessages from "~/messages/en-US/emails.order-shipped.json"
import { ORDER_SHIPPED_NAMESPACE, OrderShipped } from "~/src/presentation/emails/order-shipped"

const mapCheckoutEmailContext = (
  checkoutContext: Awaited<ReturnType<typeof getCheckoutEmailContext>>,
): CheckoutEmailContext | undefined => {
  if (checkoutContext === undefined) {
    return undefined
  }

  return {
    billingAddress: checkoutContext.billingAddress,
    billingAddressId: checkoutContext.billingAddressId,
    customerNote: checkoutContext.customerNote,
    deliveryMethod: checkoutContext.deliveryMethod,
    lockerId: checkoutContext.lockerId,
    shippingAddress: checkoutContext.shippingAddress,
    shippingAddressId: checkoutContext.shippingAddressId,
  }
}

const ORDER_SHIPPED_LABEL = "Order shipped"

const sendOrderShippedEmail = async (orderId: string, origin: string): Promise<OrderEmailOutcome> => {
  const orderRow = await getOrderForShippedEmail(orderId)
  if (orderRow === undefined) {
    return { failure: "The order could not be found", label: ORDER_SHIPPED_LABEL }
  }

  if (orderRow.email.trim() === "") {
    return { failure: "The order has no email address", label: ORDER_SHIPPED_LABEL }
  }

  const locale = resolveOrderLocale(orderRow.metadata)
  const checkoutContext =
    orderRow.checkoutId === null || orderRow.checkoutId === ""
      ? undefined
      : mapCheckoutEmailContext(await getCheckoutEmailContext(orderRow.checkoutId))
  const messages = await loadNamespace<typeof orderShippedMessages>({ locale, namespace: ORDER_SHIPPED_NAMESPACE })
  const details = buildOrderShippedDetails(checkoutContext, messages, {
    trackingNumber: orderRow.trackingNumber,
    trackingUrl: orderRow.trackingUrl,
  })
  const accountCta = buildOrderShippedAccountCta({ locale, messages, orderId: orderRow.id, origin, userId: orderRow.userId })
  const failure = await sendEmail({
    react: createElement(OrderShipped, {
      accountCta,
      details,
      locale,
      messages,
      orderNumber: orderRow.orderNumber,
    }),
    subject: createTranslator({ locale, messages })("subject"),
    to: orderRow.email,
  })

  return { failure, label: `${ORDER_SHIPPED_LABEL} → ${orderRow.email}` }
}

export const notifyOrderShipped = (orderId: string, origin: string): Promise<boolean> =>
  recordOrderEmailAttempt(sendOrderShippedEmail(orderId, origin), { label: ORDER_SHIPPED_LABEL, orderId })
