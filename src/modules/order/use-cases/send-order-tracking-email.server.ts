import { createElement } from "react"

import { createTranslator } from "use-intl"

import { sendEmail } from "~/src/integrations/resend/resend.send"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { getOrderForShippedEmail } from "~/src/modules/order/order.accessors"
import { ORDER_EMAIL_KIND } from "~/src/modules/order/order.constants"
import { resolveOrderLocale } from "~/src/modules/order/order.utils"
import { type OrderEmailOutcome, deliverOrderEmail } from "~/src/modules/order/use-cases/deliver-order-email.server"

import type orderTrackingMessages from "~/messages/en-US/emails.order-tracking.json"
import {
  buildOrderShippedAccountCta,
  resolveOrderTracking,
  toOrderShipmentEmailSource,
} from "~/src/presentation/emails/order-email-content"
import { ORDER_TRACKING_NAMESPACE, OrderTrackingUpdate } from "~/src/presentation/emails/order-tracking"

const ORDER_TRACKING_LABEL = "Tracking number"

const attemptOrderTrackingEmail = async (
  { orderId, origin, trackingNumber }: Readonly<OrderTrackingEmail>,
  idempotencyKey: string,
): Promise<OrderEmailOutcome> => {
  const orderRow = await getOrderForShippedEmail(orderId)
  if (orderRow === undefined) {
    return { failure: "The order could not be found", label: ORDER_TRACKING_LABEL }
  }

  if (orderRow.recipient.trim() === "") {
    return { failure: "The order has no email address", label: ORDER_TRACKING_LABEL }
  }

  const shipment = toOrderShipmentEmailSource(orderRow)
  const tracking = resolveOrderTracking(
    shipment.trackingNumber === trackingNumber ? shipment : { ...shipment, trackingNumber, trackingUrl: undefined },
  )
  const locale = resolveOrderLocale(orderRow.metadata)
  const messages = await loadNamespace<typeof orderTrackingMessages>({ locale, namespace: ORDER_TRACKING_NAMESPACE })
  const failure = await sendEmail({
    idempotencyKey,
    react: createElement(OrderTrackingUpdate, {
      accountCta: buildOrderShippedAccountCta({ locale, messages, orderId: orderRow.id, origin, userId: orderRow.userId }),
      locale,
      messages,
      orderNumber: orderRow.orderNumber,
      tracking,
    }),
    subject: createTranslator({ locale, messages })("subject"),
    to: orderRow.recipient,
  })

  return { failure, label: `${ORDER_TRACKING_LABEL} → ${orderRow.recipient}` }
}

export const sendOrderTrackingEmail = (email: Readonly<OrderTrackingEmail>): Promise<boolean> =>
  deliverOrderEmail((idempotencyKey) => attemptOrderTrackingEmail(email, idempotencyKey), {
    idempotencyKey: `${ORDER_EMAIL_KIND.TRACKING}/${email.orderId}/${email.trackingNumber}`,
    label: ORDER_TRACKING_LABEL,
    orderEmail: { kind: ORDER_EMAIL_KIND.TRACKING, trackingNumber: email.trackingNumber },
    orderId: email.orderId,
  })

interface OrderTrackingEmail {
  readonly orderId: string
  readonly origin: string
  readonly trackingNumber: string
}
