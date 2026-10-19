import { type SQL, sql } from "drizzle-orm"
import { type BatchItem } from "drizzle-orm/batch"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { DEFAULT_TIMEZONE_CODE } from "~/src/modules/_core/constants/timezone"
import { toCalendarDate } from "~/src/modules/_core/utils/datetime"
import { ORDER_NUMBER_PADDING, ORDER_NUMBER_PREFIX } from "~/src/modules/order/order.constants"
import { orderNumberSequence } from "~/src/modules/order/order.schema"

export const currentOrderNumberPeriod = (now: Date = new Date()): string => String(toCalendarDate(now, DEFAULT_TIMEZONE_CODE).year)

export const prepareOrderNumberAllocation = (now: Date = new Date()): OrderNumberAllocation => {
  const period = currentOrderNumberPeriod(now)

  return {
    orderNumber: sql<string>`(select printf(${ORDER_NUMBER_FORMAT}, ${orderNumberSequence.period}, ${orderNumberSequence.lastValue}) from ${orderNumberSequence} where ${orderNumberSequence.period} = ${period})`,
    statement: db
      .insert(orderNumberSequence)
      .values({ lastValue: FIRST_VALUE, period })
      .onConflictDoUpdate({
        set: { lastValue: sql`${orderNumberSequence.lastValue} + 1` },
        target: orderNumberSequence.period,
      }),
  }
}

export interface OrderNumberAllocation {
  readonly orderNumber: SQL<string>
  readonly statement: BatchItem<"sqlite">
}

const FIRST_VALUE = 1

const ORDER_NUMBER_FORMAT = `${ORDER_NUMBER_PREFIX}-%s-%0${String(ORDER_NUMBER_PADDING)}d`
