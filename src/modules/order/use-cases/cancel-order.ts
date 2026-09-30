import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { recordOrderCancelledAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { assertOrderActionState, getAdminOrderActionRow } from "~/src/modules/order/order.admin-action.server"
import { canCancelAdminOrder } from "~/src/modules/order/order.admin-actions.utils"
import { ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import { orderZodSchemas } from "~/src/modules/order/order.zod"

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([authorized({ order: ["update"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminOrderIdInput>) => orderZodSchemas.adminOrderIdInput.parse(input))
  .handler(async ({ data: { orderId } }) => {
    assertOrderActionState(await getAdminOrderActionRow(orderId), (snapshot) => canCancelAdminOrder({ status: snapshot.status }))

    await db
      .update(order)
      .set({
        canceledAt: new Date(),
        fulfillmentStatus: "cancelled",
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(order.id, orderId))

    recordOrderCancelledAudit(orderId)

    return { ok: true, orderId }
  })

export const cancelOrderMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof cancelOrder>[0]["data"]) => cancelOrder({ data }),
  mutationKey: ORDER_MUTATION_KEYS.CANCEL,
})
