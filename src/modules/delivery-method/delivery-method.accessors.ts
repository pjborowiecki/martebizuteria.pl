import { and, eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { deliveryMethod } from "~/src/modules/delivery-method/delivery-method.schema"

export const getActiveDeliveryMethodByIdQuery = (id: string) =>
  db.query.deliveryMethod.findFirst({
    where: and(eq(deliveryMethod.id, id), eq(deliveryMethod.isActive, true)),
  })
