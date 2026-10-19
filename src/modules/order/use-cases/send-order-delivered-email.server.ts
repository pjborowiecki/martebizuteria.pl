import { createElement } from "react"

import { createTranslator } from "use-intl"

import { sendEmail } from "~/src/integrations/resend/resend.send"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { getOrderForProgressEmail } from "~/src/modules/order/order.accessors"
import { ORDER_EMAIL_KIND } from "~/src/modules/order/order.constants"
import { resolveOrderLocale } from "~/src/modules/order/order.utils"
import { type OrderEmailOutcome, deliverOrderEmail } from "~/src/modules/order/use-cases/deliver-order-email.server"
import { readSellerDetails } from "~/src/modules/store-setting/store-setting.accessors"

import type orderDeliveredMessages from "~/messages/en-US/emails.order-delivered.json"
import { ORDER_DELIVERED_NAMESPACE, OrderDelivered } from "~/src/presentation/emails/order-delivered"
import { buildOrderDeliveredLinks, buildOrderShippedAccountCta } from "~/src/presentation/emails/order-email-content"

const ORDER_DELIVERED_LABEL = "Order delivered"

const attemptOrderDeliveredEmail = async (orderId: string, origin: string, idempotencyKey: string): Promise<OrderEmailOutcome> => {
  const orderRow = await getOrderForProgressEmail(orderId)
  if (orderRow === undefined) {
    return { failure: "The order could not be found", label: ORDER_DELIVERED_LABEL }
  }

  if (orderRow.recipient.trim() === "") {
    return { failure: "The order has no email address", label: ORDER_DELIVERED_LABEL }
  }

  const locale = resolveOrderLocale(orderRow.metadata)
  const [messages, seller] = await Promise.all([
    loadNamespace<typeof orderDeliveredMessages>({ locale, namespace: ORDER_DELIVERED_NAMESPACE }),
    readSellerDetails(),
  ])
  const accountCta = buildOrderShippedAccountCta({ locale, messages, orderId: orderRow.id, origin, userId: orderRow.userId })
  const links = buildOrderDeliveredLinks(origin, locale, orderRow.orderNumber)
  const failure = await sendEmail({
    idempotencyKey,
    react: createElement(OrderDelivered, { accountCta, links, locale, messages, orderNumber: orderRow.orderNumber, seller }),
    subject: createTranslator({ locale, messages })("subject"),
    to: orderRow.recipient,
  })

  return { failure, label: `${ORDER_DELIVERED_LABEL} → ${orderRow.recipient}` }
}

export const sendOrderDeliveredEmail = (orderId: string, origin: string): Promise<boolean> =>
  deliverOrderEmail((idempotencyKey) => attemptOrderDeliveredEmail(orderId, origin, idempotencyKey), {
    idempotencyKey: `${ORDER_EMAIL_KIND.DELIVERED}/${orderId}`,
    label: ORDER_DELIVERED_LABEL,
    orderEmail: { kind: ORDER_EMAIL_KIND.DELIVERED },
    orderId,
  })
