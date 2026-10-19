import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { fetchShipxLabelPdfBase64 } from "~/src/integrations/inpost/inpost.shipx.server"

import { ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { requireOrderInpostShipment } from "~/src/modules/order/use-cases/sync-order-inpost-shipment.server"

export const getInpostShipmentLabel = createServerFn({ method: "GET" })
  .middleware([authorized({ order: ["read"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminOrderIdInput>) => orderZodSchemas.adminOrderIdInput.parse(input))
  .handler(async ({ data: { orderId } }) => {
    const { orderNumber, shipmentId } = await requireOrderInpostShipment(orderId)

    return { content: await fetchShipxLabelPdfBase64(shipmentId), fileName: `${orderNumber}-inpost.pdf` }
  })

export const getInpostShipmentLabelMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof getInpostShipmentLabel>[0]["data"]) => getInpostShipmentLabel({ data }),
  mutationKey: ORDER_MUTATION_KEYS.DOWNLOAD_INPOST_LABEL,
})
