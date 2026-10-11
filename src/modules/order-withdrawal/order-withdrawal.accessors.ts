import { asc, eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { orderWithdrawal } from "~/src/modules/order-withdrawal/order-withdrawal.schema"
import { type OrderWithdrawal } from "~/src/modules/order-withdrawal/order-withdrawal.types"

export const getOrderWithdrawals = async (orderId: string): Promise<OrderWithdrawal["recorded"][]> => {
  const rows = await db
    .select({
      consumerName: orderWithdrawal.consumerName,
      email: orderWithdrawal.email,
      id: orderWithdrawal.id,
      items: orderWithdrawal.items,
      reason: orderWithdrawal.reason,
      scope: orderWithdrawal.scope,
      submittedAt: orderWithdrawal.createdAt,
    })
    .from(orderWithdrawal)
    .where(eq(orderWithdrawal.orderId, orderId))
    .orderBy(asc(orderWithdrawal.createdAt))

  return rows.map(({ consumerName, email, id, items, reason, scope, submittedAt }) => ({
    consumerName,
    email,
    id,
    items: items ?? undefined,
    reason: reason ?? undefined,
    scope,
    submittedAt,
  }))
}

export const insertOrderWithdrawal = async (
  orderId: string,
  { submittedAt, ...statement }: Readonly<OrderWithdrawal["statement"]>,
): Promise<void> => {
  await db.insert(orderWithdrawal).values({ ...statement, createdAt: submittedAt, orderId, updatedAt: submittedAt })
}
