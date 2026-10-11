import { type SQL, and, eq, isNull, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { INPOST_CANCELED_SHIPMENT_STATUS } from "~/src/integrations/inpost/inpost.constants"
import { fetchShipxShipment, inpostTrackingUrl } from "~/src/integrations/inpost/inpost.shipx.server"
import { type InpostShipment } from "~/src/integrations/inpost/inpost.zod"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { getOrderInpostShipment } from "~/src/modules/order/order.accessors"
import { ORDER_ERROR_CODES } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"

const clearedTrackingColumns = () => ({ trackingNumber: sql`null`, trackingUrl: sql`null` })

const inpostTrackingColumns = (trackingNumber: string) => ({ trackingNumber, trackingUrl: inpostTrackingUrl(trackingNumber) })

export const bookedInpostShipmentColumns = ({ status, tracking_number: trackingNumber }: InpostShipment) => ({
  inpostShipmentStatus: status,
  ...(trackingNumber === undefined ? clearedTrackingColumns() : inpostTrackingColumns(trackingNumber)),
})

export const requireOrderInpostShipment = async (orderId: string): Promise<OrderInpostShipment> => {
  const row = await getOrderInpostShipment(orderId)
  if (row === undefined) {
    throw new AppError(ERROR_CODES.NOT_FOUND, ORDER_ERROR_CODES.NOT_FOUND)
  }

  if (row.inpostShipmentId === null) {
    throw new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE)
  }

  return { orderNumber: row.orderNumber, shipmentId: row.inpostShipmentId }
}

const syncedTrackingUpdate = (holdsShipment: SQL | undefined, status: string, trackingNumber: string) =>
  status === INPOST_CANCELED_SHIPMENT_STATUS
    ? db
        .update(order)
        .set(clearedTrackingColumns())
        .where(and(holdsShipment, eq(order.trackingNumber, trackingNumber)))
    : db
        .update(order)
        .set(inpostTrackingColumns(trackingNumber))
        .where(and(holdsShipment, isNull(order.trackingNumber), isNull(order.trackingUrl)))

export const syncOrderInpostShipment = async (orderId: string, shipmentId: string): Promise<void> => {
  const { status, tracking_number: trackingNumber } = await fetchShipxShipment(shipmentId)
  const holdsShipment = and(eq(order.id, orderId), eq(order.inpostShipmentId, shipmentId))
  const statusUpdate = db.update(order).set({ inpostShipmentStatus: status, updatedAt: new Date() }).where(holdsShipment)

  if (trackingNumber === undefined) {
    await statusUpdate

    return
  }

  await db.batch([statusUpdate, syncedTrackingUpdate(holdsShipment, status, trackingNumber)])
}

interface OrderInpostShipment {
  readonly orderNumber: string
  readonly shipmentId: string
}
