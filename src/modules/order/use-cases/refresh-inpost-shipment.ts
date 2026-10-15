import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { requireOrderInpostShipment, syncOrderInpostShipment } from "~/src/modules/order/order.shipment.server"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { announceOrderShipment } from "~/src/modules/order/use-cases/announce-order-shipment.server"

import { scheduleBackgroundWork } from "~/src/lib/background"
import { resolveRequestOrigin } from "~/src/lib/request"

export const refreshInpostShipment = createServerFn({ method: "POST" })
  .middleware([authorized({ order: ["update"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminOrderIdInput>) => orderZodSchemas.adminOrderIdInput.parse(input))
  .handler(async ({ data: { orderId } }) => {
    const origin = resolveRequestOrigin(getRequest())
    const { shipmentId } = await requireOrderInpostShipment(orderId)
    await syncOrderInpostShipment(orderId, shipmentId)
    scheduleBackgroundWork(announceOrderShipment(orderId, origin))

    return { ok: true, orderId }
  })

export const refreshInpostShipmentMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof refreshInpostShipment>[0]["data"]) => refreshInpostShipment({ data }),
  mutationKey: ORDER_MUTATION_KEYS.REFRESH_INPOST_SHIPMENT,
})
