import { createElement } from "react"

import { createTranslator } from "use-intl"

import { type CheckoutEmailContext } from "~/src/integrations/resend/order-confirmation.utils"
import { buildOrderShippedAccountCta, buildOrderShippedDetails } from "~/src/integrations/resend/order-shipped.utils"
import { sendEmail } from "~/src/integrations/resend/resend.send"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { recordOrderEmailOutcome } from "~/src/modules/audit-log/audit-log.events.server"
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

export const notifyOrderShipped = async (orderId: string): Promise<void> => {
  const orderRow = await getOrderForShippedEmail(orderId)
  if (orderRow === undefined || orderRow.email.trim() === "") {
    return
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
  const accountCta = buildOrderShippedAccountCta({ locale, messages, orderId: orderRow.id, userId: orderRow.userId })
  const failure = await sendEmail({
    react: createElement(OrderShipped, {
      accountCta,
      details,
      locale,
      messages,
      orderId: orderRow.id,
    }),
    subject: createTranslator({ locale, messages })("subject"),
    to: orderRow.email,
  })

  recordOrderEmailOutcome({ failure, label: `Order shipped → ${orderRow.email}`, orderId: orderRow.id })
}
