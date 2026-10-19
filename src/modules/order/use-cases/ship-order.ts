import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { sql } from "drizzle-orm"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { recordOrderShippedAudit } from "~/src/modules/audit-log/use-cases/record-order-audit.server"
import { ORDER_MUTATION_KEYS, SHIPPABLE_FULFILLMENT_STATUSES } from "~/src/modules/order/order.constants"
import { canMarkAdminOrderShipped } from "~/src/modules/order/order.utils"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { announceOrderShipment } from "~/src/modules/order/use-cases/announce-order-shipment.server"
import { assertOrderActionState, getAdminOrderActionRow, transitionOrder } from "~/src/modules/order/use-cases/transition-order.server"

import { resolveRequestOrigin } from "~/src/lib/request"

const filledOrUndefined = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim()

  return trimmed === "" ? undefined : trimmed
}

const trackingColumns = (trackingNumber: string | undefined, trackingUrl: string | undefined) => {
  if (trackingNumber !== undefined) {
    return { trackingNumber, trackingUrl: trackingUrl ?? sql`null` }
  }

  return trackingUrl === undefined ? {} : { trackingUrl }
}

export const shipOrder = createServerFn({ method: "POST" })
  .middleware([authorized({ order: ["update"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminShipOrderInput>) => orderZodSchemas.adminShipOrderInput.parse(input))
  .handler(async ({ data: { orderId, ...tracking } }) => {
    const origin = resolveRequestOrigin(getRequest())
    const trackingNumber = filledOrUndefined(tracking.trackingNumber)
    assertOrderActionState(await getAdminOrderActionRow(orderId), (snapshot) =>
      canMarkAdminOrderShipped({ fulfillmentStatus: snapshot.fulfillmentStatus, paymentUiKey: "paid", status: snapshot.status }),
    )

    await transitionOrder(orderId, SHIPPABLE_FULFILLMENT_STATUSES, {
      fulfillmentStatus: "shipped",
      shippedAt: new Date(),
      ...trackingColumns(trackingNumber, filledOrUndefined(tracking.trackingUrl)),
    })

    recordOrderShippedAudit(orderId, { detail: trackingNumber })

    return { email: await announceOrderShipment(orderId, origin), ok: true, orderId }
  })

export const shipOrderMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof shipOrder>[0]["data"]) => shipOrder({ data }),
  mutationKey: ORDER_MUTATION_KEYS.SHIP,
})
