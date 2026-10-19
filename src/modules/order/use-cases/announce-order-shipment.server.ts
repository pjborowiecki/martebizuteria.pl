import { and, eq, isNotNull, isNull, ne, or, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ORDER_EMAIL_KIND, ORDER_EMAIL_NOTICE_STATUS } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import { type Order } from "~/src/modules/order/order.types"
import { awaitOrderEmailNotice } from "~/src/modules/order/use-cases/deliver-order-email.server"
import { sendOrderShippedEmail } from "~/src/modules/order/use-cases/send-order-shipped-email.server"
import { sendOrderTrackingEmail } from "~/src/modules/order/use-cases/send-order-tracking-email.server"

const shippedOrder = (orderId: string) => and(eq(order.id, orderId), eq(order.fulfillmentStatus, "shipped"))

const trackingNumberNotEmailed = or(isNull(order.trackingEmailNumber), ne(order.trackingEmailNumber, order.trackingNumber))

const untoldTrackingNumber = and(isNotNull(order.shippedEmailAt), isNotNull(order.trackingNumber), trackingNumberNotEmailed)

const claimShippedEmail = async (orderId: string): Promise<boolean> => {
  const claimed = await db
    .update(order)
    .set({ shippedEmailAt: new Date(), trackingEmailNumber: sql`${order.trackingNumber}` })
    .where(and(shippedOrder(orderId), isNull(order.shippedEmailAt)))
    .returning({ id: order.id })

  return claimed.length > 0
}

const claimTrackingEmail = async (orderId: string): Promise<string | undefined> => {
  const [claimed] = await db
    .update(order)
    .set({ trackingEmailNumber: sql`${order.trackingNumber}` })
    .where(and(shippedOrder(orderId), untoldTrackingNumber))
    .returning({ trackingNumber: order.trackingNumber })

  return claimed?.trackingNumber ?? undefined
}

export const announceOrderShipment = async (orderId: string, origin: string): Promise<Order["emailNotice"]> => {
  if (await claimShippedEmail(orderId)) {
    return awaitOrderEmailNotice(ORDER_EMAIL_KIND.SHIPPED, sendOrderShippedEmail(orderId, origin))
  }

  const trackingNumber = await claimTrackingEmail(orderId)

  return trackingNumber === undefined
    ? { kind: ORDER_EMAIL_KIND.SHIPPED, status: ORDER_EMAIL_NOTICE_STATUS.ALREADY_SENT }
    : awaitOrderEmailNotice(ORDER_EMAIL_KIND.TRACKING, sendOrderTrackingEmail({ orderId, origin, trackingNumber }))
}
