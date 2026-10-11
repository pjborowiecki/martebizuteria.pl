import { createElement } from "react"

import { createTranslator } from "use-intl"

import { buildOrderAccountCta } from "~/src/integrations/resend/order-confirmation.utils"
import { type OrderEmailOutcome, deliverOrderEmail } from "~/src/integrations/resend/order-email.delivery.server"
import { sendEmail } from "~/src/integrations/resend/resend.send"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { getOrderForRefundEmail } from "~/src/modules/order/order.accessors"
import { ORDER_EMAIL_KIND } from "~/src/modules/order/order.constants"
import { resolveOrderLocale } from "~/src/modules/order/order.display.utils"
import { type Order } from "~/src/modules/order/order.types"

import { resolveDeploymentOrigin } from "~/src/lib/request"

import type orderRefundedMessages from "~/messages/en-US/emails.order-refunded.json"
import { ORDER_REFUNDED_NAMESPACE, OrderRefunded } from "~/src/presentation/emails/order-refunded"

const ORDER_REFUNDED_LABEL = "Order refunded"

const sendOrderRefundedEmail = async (
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

  if (orderRow.email.trim() === "") {
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
    to: orderRow.email,
  })

  return { failure, label: `${ORDER_REFUNDED_LABEL} → ${orderRow.email}` }
}

export const notifyOrderRefunded = (refund: Order["unannouncedRefund"], returnUrl: string | undefined): Promise<boolean> =>
  deliverOrderEmail((idempotencyKey) => sendOrderRefundedEmail(refund, returnUrl, idempotencyKey), {
    idempotencyKey: `${ORDER_EMAIL_KIND.REFUNDED}/${refund.orderId}/${refund.refundedTotal}`,
    label: ORDER_REFUNDED_LABEL,
    orderEmail: {
      amount: refund.amount,
      fullyRefunded: refund.fullyRefunded,
      kind: ORDER_EMAIL_KIND.REFUNDED,
      refundedTotal: refund.refundedTotal,
    },
    orderId: refund.orderId,
  })
