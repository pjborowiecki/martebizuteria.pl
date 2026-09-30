import { sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ORDER_NUMBER_PADDING, ORDER_NUMBER_PREFIX } from "~/src/modules/order/order.constants"
import { orderNumberSequence } from "~/src/modules/order/order.schema"

export const formatOrderNumber = (period: string, value: number): string =>
  `${ORDER_NUMBER_PREFIX}-${period}-${String(value).padStart(ORDER_NUMBER_PADDING, "0")}`

export const currentOrderNumberPeriod = (now: Date = new Date()): string => String(now.getUTCFullYear())

/**
 * One upsert with RETURNING keeps the counter atomic under concurrent
 * checkouts; reading then writing would hand two orders the same number.
 */
export const allocateOrderNumber = async (now: Date = new Date()): Promise<string> => {
  const period = currentOrderNumberPeriod(now)
  const [row] = await db
    .insert(orderNumberSequence)
    .values({ lastValue: FIRST_VALUE, period })
    .onConflictDoUpdate({
      set: { lastValue: sql`${orderNumberSequence.lastValue} + 1` },
      target: orderNumberSequence.period,
    })
    .returning({ lastValue: orderNumberSequence.lastValue })

  return formatOrderNumber(period, row?.lastValue ?? FIRST_VALUE)
}

const FIRST_VALUE = 1
