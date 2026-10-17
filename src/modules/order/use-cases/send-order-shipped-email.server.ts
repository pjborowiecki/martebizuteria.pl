import { createElement } from "react"

import { createTranslator } from "use-intl"

import { sendEmail } from "~/src/integrations/resend/resend.send"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { getOrderForShippedEmail } from "~/src/modules/order/order.accessors"
import { ORDER_EMAIL_KIND } from "~/src/modules/order/order.constants"
import { resolveOrderLocale } from "~/src/modules/order/order.display.utils"
import { type OrderEmailOutcome, deliverOrderEmail } from "~/src/modules/order/order.email-delivery.server"
import { buildOrderShippedAccountCta, buildOrderShippedDetails, toOrderShipmentEmailSource } from "~/src/modules/order/order.email.utils"

import type orderShippedMessages from "~/messages/en-US/emails.order-shipped.json"
import { ORDER_SHIPPED_NAMESPACE, OrderShipped } from "~/src/presentation/emails/order-shipped"

const ORDER_SHIPPED_LABEL = "Order shipped"

const attemptOrderShippedEmail = async (orderId: string, origin: string, idempotencyKey: string): Promise<OrderEmailOutcome> => {
  const orderRow = await getOrderForShippedEmail(orderId)
  if (orderRow === undefined) {
    return { failure: "The order could not be found", label: ORDER_SHIPPED_LABEL }
  }

  if (orderRow.recipient.trim() === "") {
    return { failure: "The order has no email address", label: ORDER_SHIPPED_LABEL }
  }

  const locale = resolveOrderLocale(orderRow.metadata)
  const messages = await loadNamespace<typeof orderShippedMessages>({ locale, namespace: ORDER_SHIPPED_NAMESPACE })
  const accountCta = buildOrderShippedAccountCta({ locale, messages, orderId: orderRow.id, origin, userId: orderRow.userId })
  const details = buildOrderShippedDetails(toOrderShipmentEmailSource(orderRow), messages, locale)
  const failure = await sendEmail({
    idempotencyKey,
    react: createElement(OrderShipped, {
      accountCta,
      details,
      locale,
      messages,
      orderNumber: orderRow.orderNumber,
    }),
    subject: createTranslator({ locale, messages })("subject"),
    to: orderRow.recipient,
  })

  return { failure, label: `${ORDER_SHIPPED_LABEL} → ${orderRow.recipient}` }
}

export const sendOrderShippedEmail = (orderId: string, origin: string): Promise<boolean> =>
  deliverOrderEmail((idempotencyKey) => attemptOrderShippedEmail(orderId, origin, idempotencyKey), {
    idempotencyKey: `${ORDER_EMAIL_KIND.SHIPPED}/${orderId}`,
    label: ORDER_SHIPPED_LABEL,
    orderEmail: { kind: ORDER_EMAIL_KIND.SHIPPED },
    orderId,
  })
