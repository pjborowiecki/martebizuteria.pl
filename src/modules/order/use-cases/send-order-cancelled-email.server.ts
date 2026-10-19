import { createElement } from "react"

import { createTranslator } from "use-intl"

import { sendEmail } from "~/src/integrations/resend/resend.send"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { getOrderForRefundEmail } from "~/src/modules/order/order.accessors"
import { ORDER_EMAIL_KIND } from "~/src/modules/order/order.constants"
import { resolveOrderLocale } from "~/src/modules/order/order.utils"
import { type OrderEmailOutcome, deliverOrderEmail } from "~/src/modules/order/use-cases/deliver-order-email.server"

import type orderCancelledMessages from "~/messages/en-US/emails.order-cancelled.json"
import { ORDER_CANCELLED_NAMESPACE, OrderCancelled } from "~/src/presentation/emails/order-cancelled"
import { buildOrderAccountCta } from "~/src/presentation/emails/order-email-content"

const ORDER_CANCELLED_LABEL = "Order cancelled"

const attemptOrderCancelledEmail = async (
  { orderId, refundedAmount }: Readonly<OrderCancellation>,
  origin: string,
  idempotencyKey: string,
): Promise<OrderEmailOutcome> => {
  const orderRow = await getOrderForRefundEmail(orderId)
  if (orderRow === undefined) {
    return { failure: "The order could not be found", label: ORDER_CANCELLED_LABEL }
  }

  if (orderRow.recipient.trim() === "") {
    return { failure: "The order has no email address", label: ORDER_CANCELLED_LABEL }
  }

  const locale = resolveOrderLocale(orderRow.metadata)
  const messages = await loadNamespace<typeof orderCancelledMessages>({ locale, namespace: ORDER_CANCELLED_NAMESPACE })
  const failure = await sendEmail({
    idempotencyKey,
    react: createElement(OrderCancelled, {
      accountCta: buildOrderAccountCta({ isGuest: orderRow.userId === null, locale, messages, orderId, origin }),
      currency: orderRow.currencyCode,
      locale,
      messages,
      orderNumber: orderRow.orderNumber,
      refundedAmount,
    }),
    subject: createTranslator({ locale, messages })("subject"),
    to: orderRow.recipient,
  })

  return { failure, label: `${ORDER_CANCELLED_LABEL} → ${orderRow.recipient}` }
}

export const sendOrderCancelledEmail = (cancellation: Readonly<OrderCancellation>, origin: string): Promise<boolean> =>
  deliverOrderEmail((idempotencyKey) => attemptOrderCancelledEmail(cancellation, origin, idempotencyKey), {
    idempotencyKey: `${ORDER_EMAIL_KIND.CANCELLED}/${cancellation.orderId}`,
    label: ORDER_CANCELLED_LABEL,
    orderEmail: { kind: ORDER_EMAIL_KIND.CANCELLED, refundedAmount: cancellation.refundedAmount },
    orderId: cancellation.orderId,
  })

interface OrderCancellation {
  readonly orderId: string
  readonly refundedAmount: number | undefined
}
