import { createElement } from "react"

import { createTranslator } from "use-intl"

import { sendEmail } from "~/src/integrations/resend/resend.send"
import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { type OrderWithdrawal } from "~/src/modules/order-withdrawal/order-withdrawal.types"
import { type OrderEmailOutcome, deliverOrderEmail } from "~/src/modules/order/use-cases/deliver-order-email.server"
import { readSellerDetails } from "~/src/modules/store-setting/store-setting.accessors"

import type orderWithdrawalMessages from "~/messages/en-US/emails.order-withdrawal.json"
import { ORDER_WITHDRAWAL_NAMESPACE, OrderWithdrawalReceived } from "~/src/presentation/emails/order-withdrawal"

const ACKNOWLEDGEMENT_LABEL = "Withdrawal acknowledgement"

const ACKNOWLEDGEMENT_EMAIL_KIND = "order-withdrawal"

const sendAcknowledgement = async (
  { locale, orderNumber, statement }: Readonly<WithdrawalAcknowledgement>,
  idempotencyKey: string,
): Promise<OrderEmailOutcome> => {
  const [messages, seller] = await Promise.all([
    loadNamespace<typeof orderWithdrawalMessages>({ locale, namespace: ORDER_WITHDRAWAL_NAMESPACE }),
    readSellerDetails(),
  ])
  const failure = await sendEmail({
    idempotencyKey,
    react: createElement(OrderWithdrawalReceived, { locale, messages, orderNumber, seller, statement }),
    subject: createTranslator({ locale, messages })("received.subject", { orderNumber }),
    to: statement.email,
  })

  return { failure, label: `${ACKNOWLEDGEMENT_LABEL} → ${statement.email}` }
}

export const sendWithdrawalConfirmationEmail = (acknowledgement: Readonly<WithdrawalAcknowledgement>): Promise<boolean> =>
  deliverOrderEmail((idempotencyKey) => sendAcknowledgement(acknowledgement, idempotencyKey), {
    idempotencyKey: `${ACKNOWLEDGEMENT_EMAIL_KIND}/${acknowledgement.orderId}/${String(acknowledgement.statement.submittedAt.getTime())}`,
    label: ACKNOWLEDGEMENT_LABEL,
    orderId: acknowledgement.orderId,
  })

interface WithdrawalAcknowledgement {
  readonly locale: SupportedLocale
  readonly orderId: string
  readonly orderNumber: string
  readonly statement: OrderWithdrawal["statement"]
}
