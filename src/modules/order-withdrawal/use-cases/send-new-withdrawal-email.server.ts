import { env } from "cloudflare:workers"

import { createElement } from "react"

import { createTranslator } from "use-intl"

import { sendEmail } from "~/src/integrations/resend/resend.send"
import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { type OrderWithdrawal } from "~/src/modules/order-withdrawal/order-withdrawal.types"
import { type OrderEmailOutcome, deliverOrderEmail } from "~/src/modules/order/order.email-delivery.server"

import { buildLocalizedUrl } from "~/src/lib/seo"

import type orderWithdrawalMessages from "~/messages/en-US/emails.order-withdrawal.json"
import { ORDER_WITHDRAWAL_NAMESPACE, OrderWithdrawalNotice } from "~/src/presentation/emails/order-withdrawal"
import { ROUTES } from "~/src/routes"

const SHOP_NOTICE_LABEL = "Withdrawal notice"

const SHOP_NOTICE_EMAIL_KIND = "order-withdrawal-notice"

const sendShopNotice = async (
  { orderId, orderNumber, origin, statement }: Readonly<WithdrawalShopNotice>,
  idempotencyKey: string,
): Promise<OrderEmailOutcome> => {
  const locale = I18N.DEFAULT_LOCALE
  const messages = await loadNamespace<typeof orderWithdrawalMessages>({ locale, namespace: ORDER_WITHDRAWAL_NAMESPACE })
  const adminOrderPath = ROUTES.ADMIN_ORDER.replace("$orderId", orderId)
  const failure = await sendEmail({
    idempotencyKey,
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

export const sendNewWithdrawalEmail = (notice: Readonly<WithdrawalShopNotice>): Promise<boolean> =>
  deliverOrderEmail((idempotencyKey) => sendShopNotice(notice, idempotencyKey), {
    idempotencyKey: `${SHOP_NOTICE_EMAIL_KIND}/${notice.orderId}/${String(notice.statement.submittedAt.getTime())}`,
    label: SHOP_NOTICE_LABEL,
    orderId: notice.orderId,
  })

interface WithdrawalShopNotice {
  readonly orderId: string
  readonly orderNumber: string
  readonly origin: string
  readonly statement: OrderWithdrawal["statement"]
}
