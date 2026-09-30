import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { courier } from "~/src/modules/courier/courier.schema"
import { DELIVERY_METHOD_QUERY_KEYS } from "~/src/modules/delivery-method/delivery-method.constants"
import { deliveryMethod } from "~/src/modules/delivery-method/delivery-method.schema"

export const listDeliveryMethods = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .handler(async () => {
    const rows = await db
      .select({ courier, deliveryMethod })
      .from(deliveryMethod)
      .innerJoin(courier, eq(deliveryMethod.courierId, courier.id))
      .where(and(eq(deliveryMethod.isActive, true), eq(courier.isActive, true)))

    return rows.map((row) => Object.assign(row.deliveryMethod, { courier: row.courier }))
  })

export const listDeliveryMethodsQuery = () =>
  queryOptions({
    queryFn: () => listDeliveryMethods(),
    queryKey: DELIVERY_METHOD_QUERY_KEYS.ALL,
  })
