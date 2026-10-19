import { createElement } from "react"

import { createTranslator } from "use-intl"

import { sendEmail } from "~/src/integrations/resend/resend.send"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { getOrderForRefundEmail } from "~/src/modules/order/order.accessors"
import { ORDER_EMAIL_KIND } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"
import { resolveOrderLocale } from "~/src/modules/order/order.utils"
import { type OrderEmailOutcome, deliverOrderEmail } from "~/src/modules/order/use-cases/deliver-order-email.server"

import { resolveDeploymentOrigin } from "~/src/lib/request"

import type orderRefundedMessages from "~/messages/en-US/emails.order-refunded.json"
import { buildOrderAccountCta } from "~/src/presentation/emails/order-email-content"
import { ORDER_REFUNDED_NAMESPACE, OrderRefunded } from "~/src/presentation/emails/order-refunded"

const ORDER_REFUNDED_LABEL = "Order refunded"

const attemptOrderRefundedEmail = async (
  refund: Order["unannouncedRefund"],
  returnUrl: string | undefined,
  idempotencyKey: string,
): Promise<OrderEmailOutcome> => {
  if (returnUrl === undefined) {
    return { failure: "The Stripe session has no return URL to link the email to", label: ORDER_REFUNDED_LABEL }
  }

  const origin = resolveDeploymentOrigin(returnUrl)
  const orderRow = await getOrderForRefundEmail(refund.orderId)
  if (orderRow === undefined) {
    return { failure: "The order could not be found", label: ORDER_REFUNDED_LABEL }
  }

  if (orderRow.recipient.trim() === "") {
    return { failure: "The order has no email address", label: ORDER_REFUNDED_LABEL }
  }

  const locale = resolveOrderLocale(orderRow.metadata)
  const messages = await loadNamespace<typeof orderRefundedMessages>({ locale, namespace: ORDER_REFUNDED_NAMESPACE })
  const failure = await sendEmail({
    idempotencyKey,
    react: createElement(OrderRefunded, {
      accountCta: buildOrderAccountCta({ isGuest: orderRow.userId === null, locale, messages, orderId: refund.orderId, origin }),
      currency: orderRow.currencyCode,
      fullyRefunded: refund.fullyRefunded,
      locale,
      messages,
      orderNumber: orderRow.orderNumber,
      orderTotal: orderRow.total,
      refundedAmount: refund.amount,
    }),
    subject: createTranslator({ locale, messages })("subject"),
    to: orderRow.recipient,
  })

  return { failure, label: `${ORDER_REFUNDED_LABEL} → ${orderRow.recipient}` }
}

const refundEmailIdempotencyKey = ({ orderId, refundId, refundedTotal }: Order["refundEmail"]): string =>
  refundId === undefined
    ? `${ORDER_EMAIL_KIND.REFUNDED}/${orderId}/${refundedTotal}`
    : `${ORDER_EMAIL_KIND.REFUNDED}/${orderId}/${refundId}`

export const sendOrderRefundedEmail = (refund: Order["refundEmail"], returnUrl: string | undefined): Promise<boolean> =>
  deliverOrderEmail((idempotencyKey) => attemptOrderRefundedEmail(refund, returnUrl, idempotencyKey), {
    idempotencyKey: refundEmailIdempotencyKey(refund),
    label: ORDER_REFUNDED_LABEL,
    orderEmail: {
      amount: refund.amount,
      fullyRefunded: refund.fullyRefunded,
      kind: ORDER_EMAIL_KIND.REFUNDED,
      refundId: refund.refundId,
      refundedTotal: refund.refundedTotal,
    },
    orderId: refund.orderId,
  })
