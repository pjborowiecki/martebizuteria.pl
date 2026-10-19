import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, eq, isNull, notInArray, or } from "drizzle-orm"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { INPOST_CANCELED_SHIPMENT_STATUS } from "~/src/integrations/inpost/inpost.constants"
import { type InpostShipmentDraft, postShipxShipment } from "~/src/integrations/inpost/inpost.shipx.server"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { recordOrderShipmentCreatedAudit } from "~/src/modules/audit-log/use-cases/record-order-audit.server"
import { getAdminOrderDetailRow } from "~/src/modules/order/order.accessors"
import { DISPATCHED_FULFILLMENT_STATUSES, ORDER_ERROR_CODES, ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import { canCreateAdminOrderInpostShipment, resolveOrderShippingAddressRow } from "~/src/modules/order/order.utils"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { bookedInpostShipmentColumns } from "~/src/modules/order/use-cases/sync-order-inpost-shipment.server"
import { assertOrderActionState } from "~/src/modules/order/use-cases/transition-order.server"

type ShipmentInput = zod.output<typeof orderZodSchemas.adminCreateInpostShipmentInput>

type ShipmentOrderRow = NonNullable<Awaited<ReturnType<typeof getAdminOrderDetailRow>>>

type ShipmentAddressRow = NonNullable<ReturnType<typeof resolveOrderShippingAddressRow>>

const shipmentDestination = (row: ShipmentOrderRow, address: ShipmentAddressRow): InpostShipmentDraft["destination"] | undefined => {
  if (row.deliveryMethod?.type === "courier") {
    return {
      address: {
        city: address.city,
        countryCode: address.countryCode,
        line1: address.address1,
        line2: address.address2 ?? undefined,
        postalCode: address.postalCode ?? undefined,
      },
      type: "courier",
    }
  }

  return row.lockerId === null ? undefined : { lockerId: row.lockerId, type: "locker" }
}

const toInpostShipmentDraft = (row: ShipmentOrderRow, { parcelTemplate, weightKg }: ShipmentInput): InpostShipmentDraft => {
  const address = resolveOrderShippingAddressRow(row)
  const destination = address === undefined ? undefined : shipmentDestination(row, address)
  if (address === undefined || destination === undefined) {
    throw new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE)
  }

  return {
    destination,
    email: row.recipient,
    firstName: address.firstName ?? undefined,
    lastName: address.lastName ?? undefined,
    parcel: { template: parcelTemplate, weightKg },
    phone: address.phone ?? undefined,
    reference: row.orderNumber,
  }
}

const orderAwaitingShipment = (orderId: string) =>
  and(
    eq(order.id, orderId),
    or(isNull(order.inpostShipmentId), eq(order.inpostShipmentStatus, INPOST_CANCELED_SHIPMENT_STATUS)),
    notInArray(order.fulfillmentStatus, [...DISPATCHED_FULFILLMENT_STATUSES]),
  )

export const createInpostShipment = createServerFn({ method: "POST" })
  .middleware([authorized({ order: ["update"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminCreateInpostShipmentInput>) =>
    orderZodSchemas.adminCreateInpostShipmentInput.parse(input),
  )
  .handler(async ({ data }) => {
    const row = assertOrderActionState(await getAdminOrderDetailRow(data.orderId), (snapshot) =>
      canCreateAdminOrderInpostShipment({
        courierCode: snapshot.deliveryMethod?.courier.internalCode,
        deliveryType: snapshot.deliveryMethod?.type,
        fulfillmentStatus: snapshot.fulfillmentStatus,
        inpostShipmentId: snapshot.inpostShipmentId ?? undefined,
        inpostShipmentStatus: snapshot.inpostShipmentStatus ?? undefined,
        status: snapshot.status,
      }),
    )

    const shipment = await postShipxShipment(toInpostShipmentDraft(row, data))
    const shipmentId = String(shipment.id)
    const saved = await db
      .update(order)
      .set({ inpostShipmentId: shipmentId, ...bookedInpostShipmentColumns(shipment), updatedAt: new Date() })
      .where(orderAwaitingShipment(data.orderId))
      .returning({ id: order.id })

    if (saved.length === 0) {
      console.error(
        `[InPost] Order ${data.orderId} shipped or got another shipment while ShipX shipment ${shipmentId} was booked; cancel it in InPost Manager`,
      )

      throw new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE)
    }

    recordOrderShipmentCreatedAudit(data.orderId, { detail: shipmentId })

    return { ok: true, orderId: data.orderId }
  })

export const createInpostShipmentMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof createInpostShipment>[0]["data"]) => createInpostShipment({ data }),
  mutationKey: ORDER_MUTATION_KEYS.CREATE_INPOST_SHIPMENT,
})
