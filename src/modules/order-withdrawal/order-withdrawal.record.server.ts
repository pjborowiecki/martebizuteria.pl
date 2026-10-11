import { scheduleAdminOrdersInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"
import { acknowledgeOrderWithdrawal, notifyShopOfOrderWithdrawal } from "~/src/integrations/resend/order-withdrawal.notification.server"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { recordOrderWithdrawalReceivedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { getOrderWithdrawals, insertOrderWithdrawal } from "~/src/modules/order-withdrawal/order-withdrawal.accessors"
import { ORDER_WITHDRAWAL_OUTCOME } from "~/src/modules/order-withdrawal/order-withdrawal.constants"
import { type OrderWithdrawal } from "~/src/modules/order-withdrawal/order-withdrawal.types"
import { coversWholeOrder, isOrderWithdrawalOpen } from "~/src/modules/order-withdrawal/order-withdrawal.utils"
import { type Order } from "~/src/modules/order/order.types"

import { scheduleBackgroundWork } from "~/src/lib/background"

export const recordOrderWithdrawal = async ({
  order: orderRow,
  statement,
}: Readonly<OrderWithdrawalSubmission>): Promise<OrderWithdrawal["recording"]> => {
  if (!isOrderWithdrawalOpen(orderRow, new Date())) {
    return { outcome: ORDER_WITHDRAWAL_OUTCOME.CLOSED }
  }

  if (coversWholeOrder(await getOrderWithdrawals(orderRow.id))) {
    return { outcome: ORDER_WITHDRAWAL_OUTCOME.ALREADY_WITHDRAWN }
  }

  const withdrawal = { ...statement, email: orderRow.email, submittedAt: new Date() }
  await insertOrderWithdrawal(orderRow.id, withdrawal)
  scheduleAdminOrdersInvalidation()
  recordOrderWithdrawalReceivedAudit(
    orderRow.id,
    { email: orderRow.email, name: statement.consumerName, role: "customer" },
    { detail: orderRow.orderNumber, metadata: { scope: statement.scope } },
  )

  return { outcome: ORDER_WITHDRAWAL_OUTCOME.RECORDED, withdrawal }
}

export const sendOrderWithdrawalEmails = async ({
  order: orderRow,
  origin,
  withdrawal,
}: Readonly<OrderWithdrawalEmails>): Promise<boolean> => {
  const notice = { orderId: orderRow.id, orderNumber: orderRow.orderNumber, statement: withdrawal }
  const deliveries = Promise.all([
    acknowledgeOrderWithdrawal({ ...notice, locale: getCurrentLocale() }),
    notifyShopOfOrderWithdrawal({ ...notice, origin }),
  ])
  scheduleBackgroundWork(deliveries)
  const [acknowledged] = await deliveries

  return acknowledged
}

interface OrderWithdrawalSubmission {
  readonly order: Pick<Order["select"], "deliveredAt" | "email" | "id" | "orderNumber" | "status">
  readonly statement: Pick<OrderWithdrawal["statement"], "consumerName" | "items" | "reason" | "scope">
}

interface OrderWithdrawalEmails {
  readonly order: Pick<Order["select"], "id" | "orderNumber">
  readonly origin: string
  readonly withdrawal: OrderWithdrawal["statement"]
}
