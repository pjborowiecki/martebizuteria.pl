import { queryOptions } from "@tanstack/react-query"
import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { getOrderWithdrawals } from "~/src/modules/order-withdrawal/order-withdrawal.accessors"
import { ORDER_WITHDRAWAL_QUERY_KEYS, ORDER_WITHDRAWAL_QUERY_STALE_MS } from "~/src/modules/order-withdrawal/order-withdrawal.constants"
import { type OrderWithdrawal } from "~/src/modules/order-withdrawal/order-withdrawal.types"
import { coversWholeOrder, isOrderWithdrawalOpen } from "~/src/modules/order-withdrawal/order-withdrawal.utils"
import { orderWithdrawalZodSchemas } from "~/src/modules/order-withdrawal/order-withdrawal.zod"
import { orderRecipientEmail } from "~/src/modules/order/order.accessors"
import { order } from "~/src/modules/order/order.schema"

export const getCustomerOrderWithdrawal = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .validator((input: zod.input<typeof orderWithdrawalZodSchemas.orderIdInput>) => orderWithdrawalZodSchemas.orderIdInput.parse(input))
  .handler(async ({ context, data: { orderId } }): Promise<OrderWithdrawal["customerOrder"] | undefined> => {
    const orderRow = await db.query.order.findFirst({
      columns: { deliveredAt: true, status: true },
      extras: { recipient: orderRecipientEmail().as("recipient") },
      where: and(eq(order.id, orderId), eq(order.userId, context.auth.user.id)),
    })

    if (orderRow === undefined) {
      return undefined
    }

    const statements = await getOrderWithdrawals(orderId)

    return {
      canWithdraw: isOrderWithdrawalOpen(orderRow, new Date()) && !coversWholeOrder(statements),
      consumerName: context.auth.user.name,
      email: orderRow.recipient,
      statements,
    }
  })

export const getCustomerOrderWithdrawalQuery = (orderId: string) =>
  queryOptions({
    queryFn: async () => {
      const withdrawal = await getCustomerOrderWithdrawal({ data: { orderId } })

      if (withdrawal === undefined) {
        throw notFound()
      }

      return withdrawal
    },
    queryKey: [...ORDER_WITHDRAWAL_QUERY_KEYS.CUSTOMER_ORDER, orderId],
    staleTime: ORDER_WITHDRAWAL_QUERY_STALE_MS,
  })
