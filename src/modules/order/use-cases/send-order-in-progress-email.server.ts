import { createElement } from "react"

import { createTranslator } from "use-intl"

import { sendEmail } from "~/src/integrations/resend/resend.send"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { getOrderForProgressEmail } from "~/src/modules/order/order.accessors"
import { ORDER_EMAIL_KIND } from "~/src/modules/order/order.constants"
import { resolveOrderLocale } from "~/src/modules/order/order.display.utils"
import { type OrderEmailOutcome, deliverOrderEmail } from "~/src/modules/order/order.email-delivery.server"
import { buildOrderShippedAccountCta } from "~/src/modules/order/order.email.utils"
import { resolveLocalizedString } from "~/src/modules/product-attribute/product-attribute.utils"

import type orderInProgressMessages from "~/messages/en-US/emails.order-in-progress.json"
import { ORDER_IN_PROGRESS_NAMESPACE, OrderInProgress } from "~/src/presentation/emails/order-in-progress"

const ORDER_IN_PROGRESS_LABEL = "Order in progress"

const attemptOrderInProgressEmail = async (orderId: string, origin: string, idempotencyKey: string): Promise<OrderEmailOutcome> => {
  const orderRow = await getOrderForProgressEmail(orderId)
  if (orderRow === undefined) {
    return { failure: "The order could not be found", label: ORDER_IN_PROGRESS_LABEL }
  }

  if (orderRow.email.trim() === "") {
    return { failure: "The order has no email address", label: ORDER_IN_PROGRESS_LABEL }
  }

  const locale = resolveOrderLocale(orderRow.metadata)
  const messages = await loadNamespace<typeof orderInProgressMessages>({ locale, namespace: ORDER_IN_PROGRESS_NAMESPACE })
  const accountCta = buildOrderShippedAccountCta({ locale, messages, orderId: orderRow.id, origin, userId: orderRow.userId })
  const { deliveryMethod } = orderRow
  const delivery = {
    methodName: deliveryMethod === null ? undefined : resolveLocalizedString(deliveryMethod.names, locale),
    type: deliveryMethod?.type ?? "courier",
  }
  const failure = await sendEmail({
    idempotencyKey,
    react: createElement(OrderInProgress, { accountCta, delivery, locale, messages, orderNumber: orderRow.orderNumber }),
    subject: createTranslator({ locale, messages })("subject"),
    to: orderRow.email,
  })

  return { failure, label: `${ORDER_IN_PROGRESS_LABEL} → ${orderRow.email}` }
}

export const sendOrderInProgressEmail = (orderId: string, origin: string): Promise<boolean> =>
  deliverOrderEmail((idempotencyKey) => attemptOrderInProgressEmail(orderId, origin, idempotencyKey), {
    idempotencyKey: `${ORDER_EMAIL_KIND.IN_PROGRESS}/${orderId}`,
    label: ORDER_IN_PROGRESS_LABEL,
    orderEmail: { kind: ORDER_EMAIL_KIND.IN_PROGRESS },
    orderId,
  })
