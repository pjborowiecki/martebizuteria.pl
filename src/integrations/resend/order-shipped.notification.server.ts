import { createElement } from "react"

import { type CheckoutEmailContext } from "~/src/integrations/resend/order-confirmation.utils"
import { buildOrderShippedAccountCta, buildOrderShippedDetails } from "~/src/integrations/resend/order-shipped.utils"
import { sendEmail } from "~/src/integrations/resend/resend.send"

import { recordEmailFailedAudit, recordEmailSentAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { getCheckoutEmailContext } from "~/src/modules/checkout/checkout.accessors"
import { getOrderForShippedEmail } from "~/src/modules/order/order.accessors"
import { resolveOrderLocale } from "~/src/modules/order/order.display.utils"

import { OrderShipped, getOrderShippedSubject } from "~/src/presentation/emails/order-shipped"
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
const recordOrderShippedEmailOutcome = (
  orderId: string,
  email: string,
  outcome: Readonly<{
    error?: unknown
    rejectedMessage?: string | undefined
  }>,
): void => {
  const detailPrefix = `Order shipped → ${email}`
  if (outcome.error !== undefined) {
    console.error(`Order shipped email failed for ${orderId}:`, outcome.error)
    recordEmailFailedAudit(orderId, {
      detail: detailPrefix,
      resourceId: orderId,
    })
    return
  }
  if (outcome.rejectedMessage !== undefined) {
    console.error(`Order shipped email rejected for ${orderId}: ${outcome.rejectedMessage}`)
    recordEmailFailedAudit(orderId, {
      detail: `${detailPrefix} — ${outcome.rejectedMessage}`,
      resourceId: orderId,
    })
    return
  }
  recordEmailSentAudit(orderId, {
    detail: detailPrefix,
    resourceId: orderId,
  })
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
  const details = buildOrderShippedDetails(checkoutContext, locale)
  const accountCta = buildOrderShippedAccountCta(locale, orderRow.id, orderRow.userId)
  const [response, error] = await sendEmail({
    react: createElement(OrderShipped, {
      accountCta,
      details,
      locale,
      orderId: orderRow.id,
    }),
    subject: getOrderShippedSubject(locale),
    to: orderRow.email,
  })
  recordOrderShippedEmailOutcome(orderRow.id, orderRow.email, {
    error,
    rejectedMessage: response?.error?.message ?? undefined,
  })
}
