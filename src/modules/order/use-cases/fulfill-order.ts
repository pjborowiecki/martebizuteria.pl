import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { recordOrderFulfillmentStartedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { assertOrderActionState, getAdminOrderActionRow } from "~/src/modules/order/order.admin-action.server"
import { canFulfillAdminOrder } from "~/src/modules/order/order.admin-actions.utils"
import { ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import { orderZodSchemas } from "~/src/modules/order/order.zod"

export const fulfillOrder = createServerFn({ method: "POST" })
  .middleware([authorized({ order: ["update"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminOrderIdInput>) => orderZodSchemas.adminOrderIdInput.parse(input))
  .handler(async ({ data: { orderId } }) => {
    const row = assertOrderActionState(await getAdminOrderActionRow(orderId), (snapshot) =>
      canFulfillAdminOrder({ fulfillmentStatus: snapshot.fulfillmentStatus, paymentUiKey: "paid", status: snapshot.status }),
    )

    await db
      .update(order)
      .set({
        fulfillmentStatus: "fulfilled",
        status: row.status === "pending" ? "processing" : row.status,
        updatedAt: new Date(),
      })
      .where(eq(order.id, orderId))

    recordOrderFulfillmentStartedAudit(orderId)

    return { ok: true, orderId }
  })

export const fulfillOrderMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof fulfillOrder>[0]["data"]) => fulfillOrder({ data }),
  mutationKey: ORDER_MUTATION_KEYS.FULFILL,
})
