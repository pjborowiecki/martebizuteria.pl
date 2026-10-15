import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { sql } from "drizzle-orm"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { recordOrderTrackingUpdatedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { assertOrderActionState, getAdminOrderActionRow, transitionOrder } from "~/src/modules/order/order.admin-action.server"
import { canSetAdminOrderTrackingNumber } from "~/src/modules/order/order.admin-actions.utils"
import { ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { announceOrderShipment } from "~/src/modules/order/use-cases/announce-order-shipment.server"

import { resolveRequestOrigin } from "~/src/lib/request"

export const setOrderTrackingNumber = createServerFn({ method: "POST" })
  .middleware([authorized({ order: ["update"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminSetTrackingNumberInput>) =>
    orderZodSchemas.adminSetTrackingNumberInput.parse(input),
  )
  .handler(async ({ data: { orderId, trackingNumber, trackingUrl } }) => {
    const origin = resolveRequestOrigin(getRequest())
    assertOrderActionState(await getAdminOrderActionRow(orderId), (snapshot) => canSetAdminOrderTrackingNumber(snapshot))

    await transitionOrder(orderId, ["shipped"], { trackingNumber, trackingUrl: trackingUrl ?? sql`null` })

    recordOrderTrackingUpdatedAudit(orderId, { detail: trackingNumber })

    return { email: await announceOrderShipment(orderId, origin), ok: true, orderId }
  })

export const setOrderTrackingNumberMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof setOrderTrackingNumber>[0]["data"]) => setOrderTrackingNumber({ data }),
  mutationKey: ORDER_MUTATION_KEYS.SET_TRACKING_NUMBER,
})
