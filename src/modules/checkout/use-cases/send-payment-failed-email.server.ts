import { createElement } from "react"

import type StripeType from "stripe"
import { createTranslator } from "use-intl"

import { sendEmail } from "~/src/integrations/resend/resend.send"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { resolveCheckoutSessionLocale } from "~/src/modules/checkout/checkout-metadata.zod"
import { getCheckoutEmailContext } from "~/src/modules/checkout/checkout.accessors"
import { readCheckoutSessionLines } from "~/src/modules/checkout/checkout.session-lines.server"
import { type OrderEmailOutcome, deliverOrderEmail } from "~/src/modules/order/order.email-delivery.server"
import { buildOrderConfirmationItems } from "~/src/modules/order/order.email.utils"

import { resolveDeploymentOrigin } from "~/src/lib/request"
import { buildLocalizedUrl } from "~/src/lib/seo"

import type paymentFailedMessages from "~/messages/en-US/emails.payment-failed.json"
import { PAYMENT_FAILED_NAMESPACE, PaymentFailed } from "~/src/presentation/emails/payment-failed"
import { ROUTES } from "~/src/routes"

const PAYMENT_FAILED_LABEL = "Payment failed"

const attemptPaymentFailedEmail = async (session: StripeType.Checkout.Session, idempotencyKey: string): Promise<OrderEmailOutcome> => {
  if (session.return_url === undefined) {
    return { failure: "The Stripe session has no return URL to link the email to", label: PAYMENT_FAILED_LABEL }
  }

  const checkoutId = session.metadata?.["checkoutId"]
  const checkoutContext = checkoutId === undefined || checkoutId === "" ? undefined : await getCheckoutEmailContext(checkoutId)
  if (checkoutContext === undefined) {
    return { failure: "The Stripe session names no checkout to email", label: PAYMENT_FAILED_LABEL }
  }

  const { email } = checkoutContext

  const origin = resolveDeploymentOrigin(session.return_url)
  const locale = resolveCheckoutSessionLocale(session)
  const messages = await loadNamespace<typeof paymentFailedMessages>({ locale, namespace: PAYMENT_FAILED_NAMESPACE })
  const lines = await readCheckoutSessionLines(session)
  const failure = await sendEmail({
    idempotencyKey,
    react: createElement(PaymentFailed, {
      amount: session.amount_total,
      currency: session.currency,
      items: buildOrderConfirmationItems(lines, locale, origin),
      locale,
      messages,
      shopUrl: buildLocalizedUrl(origin, ROUTES.PRODUCTS, locale),
    }),
    subject: createTranslator({ locale, messages })("subject"),
    to: email,
  })

  return { failure, label: `${PAYMENT_FAILED_LABEL} → ${email}` }
}

export const sendPaymentFailedEmail = (session: StripeType.Checkout.Session): Promise<boolean> =>
  deliverOrderEmail((idempotencyKey) => attemptPaymentFailedEmail(session, idempotencyKey), {
    idempotencyKey: `payment-failed/${session.id}`,
    label: PAYMENT_FAILED_LABEL,
    orderId: session.id,
  })
