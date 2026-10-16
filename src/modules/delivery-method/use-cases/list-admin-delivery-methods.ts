import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { listCouriers } from "~/src/modules/courier/courier.accessors"
import { listAdminDeliveryMethodRows } from "~/src/modules/delivery-method/delivery-method.accessors"
import { DELIVERY_METHOD_QUERY_KEYS } from "~/src/modules/delivery-method/delivery-method.constants"
import { type DeliveryMethod } from "~/src/modules/delivery-method/delivery-method.types"

export const listAdminDeliveryMethods = createServerFn({ method: "GET" })
  .middleware([authorized({ settings: ["manage"] })])
  .handler(async (): Promise<DeliveryMethod["adminList"]> => {
    const [couriers, rows] = await Promise.all([listCouriers(), listAdminDeliveryMethodRows()])

    return {
      couriers,
      methods: rows.map(({ courier, deliveryMethod }) => ({
        archivedAt: deliveryMethod.archivedAt ?? undefined,
        courier,
        id: deliveryMethod.id,
        isActive: deliveryMethod.isActive,
        names: deliveryMethod.names,
        price: deliveryMethod.price,
        type: deliveryMethod.type,
        updatedAt: deliveryMethod.updatedAt,
      })),
    }
  })

export const listAdminDeliveryMethodsQuery = () =>
  queryOptions({
    queryFn: () => listAdminDeliveryMethods(),
    queryKey: DELIVERY_METHOD_QUERY_KEYS.ADMIN.ALL,
  })
