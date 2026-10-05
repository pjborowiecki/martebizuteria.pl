import { createElement } from "react"

import { createTranslator } from "use-intl"

import { buildOrderAccountCta } from "~/src/integrations/resend/order-confirmation.utils"
import { type OrderEmailOutcome, recordOrderEmailAttempt } from "~/src/integrations/resend/order-email.outcome.server"
import { sendEmail } from "~/src/integrations/resend/resend.send"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { getOrderForRefundEmail } from "~/src/modules/order/order.accessors"
import { resolveOrderLocale } from "~/src/modules/order/order.display.utils"

import type orderCancelledMessages from "~/messages/en-US/emails.order-cancelled.json"
import { ORDER_CANCELLED_NAMESPACE, OrderCancelled } from "~/src/presentation/emails/order-cancelled"

const ORDER_CANCELLED_LABEL = "Order cancelled"

const sendOrderCancelledEmail = async (
  { orderId, refundedAmount }: Readonly<OrderCancellation>,
  origin: string,
): Promise<OrderEmailOutcome> => {
  const orderRow = await getOrderForRefundEmail(orderId)
  if (orderRow === undefined) {
    return { failure: "The order could not be found", label: ORDER_CANCELLED_LABEL }
  }

  if (orderRow.email.trim() === "") {
    return { failure: "The order has no email address", label: ORDER_CANCELLED_LABEL }
  }

  const locale = resolveOrderLocale(orderRow.metadata)
  const messages = await loadNamespace<typeof orderCancelledMessages>({ locale, namespace: ORDER_CANCELLED_NAMESPACE })
  const failure = await sendEmail({
    react: createElement(OrderCancelled, {
      accountCta: buildOrderAccountCta({ isGuest: orderRow.userId === null, locale, messages, orderId, origin }),
      currency: orderRow.currencyCode,
      locale,
      messages,
      orderNumber: orderRow.orderNumber,
      refundedAmount,
    }),
    subject: createTranslator({ locale, messages })("subject"),
    to: orderRow.email,
  })

  return { failure, label: `${ORDER_CANCELLED_LABEL} → ${orderRow.email}` }
}

export const notifyOrderCancelled = (cancellation: Readonly<OrderCancellation>, origin: string): Promise<boolean> =>
  recordOrderEmailAttempt(sendOrderCancelledEmail(cancellation, origin), { label: ORDER_CANCELLED_LABEL, orderId: cancellation.orderId })

interface OrderCancellation {
  readonly orderId: string
  readonly refundedAmount: number | undefined
}
