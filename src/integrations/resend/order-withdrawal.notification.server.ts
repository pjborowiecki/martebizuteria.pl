import { env } from "cloudflare:workers"

import { createElement } from "react"

import { createTranslator } from "use-intl"

import { type OrderEmailOutcome, recordOrderEmailAttempt } from "~/src/integrations/resend/order-email.outcome.server"
import { sendEmail } from "~/src/integrations/resend/resend.send"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { type OrderWithdrawal } from "~/src/modules/order-withdrawal/order-withdrawal.types"

import { buildLocalizedUrl } from "~/src/lib/seo"

import type orderWithdrawalMessages from "~/messages/en-US/emails.order-withdrawal.json"
import { ORDER_WITHDRAWAL_NAMESPACE, OrderWithdrawalNotice, OrderWithdrawalReceived } from "~/src/presentation/emails/order-withdrawal"
import { ROUTES } from "~/src/routes"

const ACKNOWLEDGEMENT_LABEL = "Withdrawal acknowledgement"

const SHOP_NOTICE_LABEL = "Withdrawal notice"

const loadMessages = (locale: SupportedLocale) =>
  loadNamespace<typeof orderWithdrawalMessages>({ locale, namespace: ORDER_WITHDRAWAL_NAMESPACE })

const sendAcknowledgement = async ({ locale, orderNumber, statement }: Readonly<WithdrawalAcknowledgement>): Promise<OrderEmailOutcome> => {
  const messages = await loadMessages(locale)
  const failure = await sendEmail({
    react: createElement(OrderWithdrawalReceived, { locale, messages, orderNumber, statement }),
    subject: createTranslator({ locale, messages })("received.subject", { orderNumber }),
    to: statement.email,
  })

  return { failure, label: `${ACKNOWLEDGEMENT_LABEL} → ${statement.email}` }
}

export const acknowledgeOrderWithdrawal = (acknowledgement: Readonly<WithdrawalAcknowledgement>): Promise<boolean> =>
  recordOrderEmailAttempt(sendAcknowledgement(acknowledgement), { label: ACKNOWLEDGEMENT_LABEL, orderId: acknowledgement.orderId })

const sendShopNotice = async ({ orderId, orderNumber, origin, statement }: Readonly<WithdrawalShopNotice>): Promise<OrderEmailOutcome> => {
  const locale = I18N.DEFAULT_LOCALE
  const messages = await loadMessages(locale)
  const adminOrderPath = ROUTES.ADMIN_ORDER.replace("$orderId", orderId)
  const failure = await sendEmail({
    react: createElement(OrderWithdrawalNotice, {
      adminOrderUrl: buildLocalizedUrl(origin, adminOrderPath, locale),
      locale,
      messages,
      orderNumber,
      statement,
    }),
    subject: createTranslator({ locale, messages })("notice.subject", { orderNumber }),
    to: env.RESEND_EMAIL_FROM,
  })

  return { failure, label: `${SHOP_NOTICE_LABEL} → ${env.RESEND_EMAIL_FROM}` }
}

export const notifyShopOfOrderWithdrawal = (notice: Readonly<WithdrawalShopNotice>): Promise<boolean> =>
  recordOrderEmailAttempt(sendShopNotice(notice), { label: SHOP_NOTICE_LABEL, orderId: notice.orderId })

interface WithdrawalNotice {
  readonly orderId: string
  readonly orderNumber: string
  readonly statement: OrderWithdrawal["statement"]
}

interface WithdrawalAcknowledgement extends WithdrawalNotice {
  readonly locale: SupportedLocale
}

interface WithdrawalShopNotice extends WithdrawalNotice {
  readonly origin: string
}
