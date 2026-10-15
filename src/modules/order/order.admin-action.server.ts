import { and, eq, inArray, notInArray } from "drizzle-orm"
import { type SQLiteUpdateSetSource } from "drizzle-orm/sqlite-core"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { CANCELLED_ORDER_STATUSES, ORDER_ERROR_CODES } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import { type Order } from "~/src/modules/order/order.types"

export const getAdminOrderActionRow = (orderId: string): Promise<AdminOrderActionRow | undefined> =>
  db.query.order.findFirst({
    columns: {
      fulfillmentStatus: true,
      status: true,
    },
    where: eq(order.id, orderId),
  })

export const assertOrderActionState = <TRow extends AdminOrderActionRow>(
  row: TRow | undefined,
  predicate: (snapshot: TRow) => boolean,
): TRow => {
  if (row === undefined) {
    throw new AppError(ERROR_CODES.NOT_FOUND, ORDER_ERROR_CODES.NOT_FOUND)
  }

  if (!predicate(row)) {
    throw new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE)
  }

  return row
}

export const transitionOrder = async (
  orderId: string,
  from: readonly Order["select"]["fulfillmentStatus"][],
  values: SQLiteUpdateSetSource<typeof order>,
): Promise<void> => {
  const moved = await db
    .update(order)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(order.id, orderId), inArray(order.fulfillmentStatus, [...from]), notInArray(order.status, [...CANCELLED_ORDER_STATUSES])))
    .returning({ id: order.id })

  if (moved.length === 0) {
    throw new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE)
  }
}

interface AdminOrderActionRow {
  readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"]
  readonly status: Order["select"]["status"]
}
