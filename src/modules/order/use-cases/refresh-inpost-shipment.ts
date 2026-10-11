import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { requireOrderInpostShipment, syncOrderInpostShipment } from "~/src/modules/order/order.shipment.server"
import { orderZodSchemas } from "~/src/modules/order/order.zod"

export const refreshInpostShipment = createServerFn({ method: "POST" })
  .middleware([authorized({ order: ["update"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminOrderIdInput>) => orderZodSchemas.adminOrderIdInput.parse(input))
  .handler(async ({ data: { orderId } }) => {
    const { shipmentId } = await requireOrderInpostShipment(orderId)
    await syncOrderInpostShipment(orderId, shipmentId)

    return { ok: true, orderId }
  })

export const refreshInpostShipmentMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof refreshInpostShipment>[0]["data"]) => refreshInpostShipment({ data }),
  mutationKey: ORDER_MUTATION_KEYS.REFRESH_INPOST_SHIPMENT,
})
