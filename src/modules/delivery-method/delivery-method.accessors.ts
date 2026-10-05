import { and, eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { courier } from "~/src/modules/courier/courier.schema"
import { deliveryMethod } from "~/src/modules/delivery-method/delivery-method.schema"

export const offeredDeliveryMethod = and(eq(deliveryMethod.isActive, true), eq(courier.isActive, true))

export const getOfferedDeliveryMethodByIdQuery = async (id: string) => {
  const [method] = await db
    .select({ price: deliveryMethod.price, type: deliveryMethod.type })
    .from(deliveryMethod)
    .innerJoin(courier, eq(deliveryMethod.courierId, courier.id))
    .where(and(eq(deliveryMethod.id, id), offeredDeliveryMethod))
    .limit(1)

  return method
}
