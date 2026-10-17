import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { and, asc, eq } from "drizzle-orm"
import type * as zod from "zod"

import { RATE_LIMITS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { inJsonList } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { orderItem } from "~/src/modules/order-item/order-item.schema"
import {
  ORDER_WITHDRAWAL_MUTATION_KEYS,
  ORDER_WITHDRAWAL_OUTCOME,
  ORDER_WITHDRAWAL_SCOPE,
} from "~/src/modules/order-withdrawal/order-withdrawal.constants"
import { recordOrderWithdrawal, sendOrderWithdrawalEmails } from "~/src/modules/order-withdrawal/order-withdrawal.record.server"
import { type OrderWithdrawal } from "~/src/modules/order-withdrawal/order-withdrawal.types"
import { describeWithdrawnItems, presentText } from "~/src/modules/order-withdrawal/order-withdrawal.utils"
import { orderWithdrawalZodSchemas } from "~/src/modules/order-withdrawal/order-withdrawal.zod"
import { orderRecipientEmail } from "~/src/modules/order/order.accessors"
import { order } from "~/src/modules/order/order.schema"

import { resolveRequestOrigin } from "~/src/lib/request"

const describeChosenItems = async (orderId: string, orderItemIds: readonly string[]): Promise<string> => {
  const lines = await db
    .select({ quantity: orderItem.quantity, title: orderItem.title, variantTitle: orderItem.variantTitle })
    .from(orderItem)
    .where(and(eq(orderItem.orderId, orderId), inJsonList(orderItem.id, orderItemIds)))
    .orderBy(asc(orderItem.createdAt))

  if (lines.length === 0) {
    throw new AppError(ERROR_CODES.VALIDATION)
  }

  return describeWithdrawnItems(lines)
}

export const withdrawFromCustomerOrder = createServerFn({ method: "POST" })
  .middleware([withRateLimit("withdraw-from-customer-order", RATE_LIMITS.SENSITIVE), authorized()])
  .validator((input: zod.input<typeof orderWithdrawalZodSchemas.customerInput>) => orderWithdrawalZodSchemas.customerInput.parse(input))
  .handler(async ({ context, data }): Promise<OrderWithdrawal["result"]> => {
    const origin = resolveRequestOrigin(getRequest())
    const orderRow = await db.query.order.findFirst({
      columns: { deliveredAt: true, id: true, orderNumber: true, status: true },
      extras: { recipient: orderRecipientEmail().as("recipient") },
      where: and(eq(order.id, data.orderId), eq(order.userId, context.auth.user.id)),
    })

    if (orderRow === undefined) {
      return { outcome: ORDER_WITHDRAWAL_OUTCOME.NOT_FOUND }
    }

    const recorded = await recordOrderWithdrawal({
      email: orderRow.recipient,
      order: orderRow,
      statement: {
        consumerName: data.consumerName,
        items: data.scope === ORDER_WITHDRAWAL_SCOPE.ITEMS ? await describeChosenItems(orderRow.id, data.orderItemIds) : undefined,
        reason: presentText(data.reason),
        scope: data.scope,
      },
    })

    if (recorded.outcome !== ORDER_WITHDRAWAL_OUTCOME.RECORDED) {
      return recorded
    }

    const { withdrawal } = recorded
    const acknowledged = await sendOrderWithdrawalEmails({ order: orderRow, origin, withdrawal })

    return {
      outcome: ORDER_WITHDRAWAL_OUTCOME.RECORDED,
      receipt: { acknowledged, email: withdrawal.email, submittedAt: withdrawal.submittedAt },
    }
  })

export const withdrawFromCustomerOrderMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof withdrawFromCustomerOrder>[0]["data"]) => withdrawFromCustomerOrder({ data }),
  mutationKey: ORDER_WITHDRAWAL_MUTATION_KEYS.WITHDRAW_FROM_CUSTOMER_ORDER,
})
