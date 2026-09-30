import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq, sql } from "drizzle-orm"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { notifyOrderShipped } from "~/src/integrations/resend/order-shipped.notification.server"

import { recordOrderShippedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { assertOrderActionState, getAdminOrderActionRow } from "~/src/modules/order/order.admin-action.server"
import { canMarkAdminOrderShipped } from "~/src/modules/order/order.admin-actions.utils"
import { ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import { orderZodSchemas } from "~/src/modules/order/order.zod"

import { scheduleBackgroundWork } from "~/src/lib/background"

const trimmedOrNull = (value: string | undefined) => {
  const trimmed = value?.trim()

  return trimmed === undefined || trimmed === "" ? sql`null` : trimmed
}

export const shipOrder = createServerFn({ method: "POST" })
  .middleware([authorized({ order: ["update"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminShipOrderInput>) => orderZodSchemas.adminShipOrderInput.parse(input))
  .handler(async ({ data: { orderId, trackingNumber, trackingUrl } }) => {
    assertOrderActionState(await getAdminOrderActionRow(orderId), (snapshot) =>
      canMarkAdminOrderShipped({ fulfillmentStatus: snapshot.fulfillmentStatus, paymentUiKey: "paid", status: snapshot.status }),
    )

    await db
      .update(order)
      .set({
        fulfillmentStatus: "shipped",
        shippedAt: new Date(),
        trackingNumber: trimmedOrNull(trackingNumber),
        trackingUrl: trimmedOrNull(trackingUrl),
        updatedAt: new Date(),
      })
      .where(eq(order.id, orderId))

    recordOrderShippedAudit(orderId, {
      detail: trackingNumber?.trim() === "" ? undefined : trackingNumber?.trim(),
    })
    scheduleBackgroundWork(notifyOrderShipped(orderId))

    return { ok: true, orderId }
  })

export const shipOrderMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof shipOrder>[0]["data"]) => shipOrder({ data }),
  mutationKey: ORDER_MUTATION_KEYS.SHIP,
})
