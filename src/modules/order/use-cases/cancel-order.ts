import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { recordOrderCancelledAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { assertOrderActionState, getAdminOrderActionRow } from "~/src/modules/order/order.admin-action.server"
import { canCancelAdminOrder } from "~/src/modules/order/order.admin-actions.utils"
import { order } from "~/src/modules/order/order.schema"
import { orderZodSchemas } from "~/src/modules/order/order.zod"

export const cancelAdminOrderFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => orderZodSchemas.adminOrderIdInput.parse(data))
  .handler(async ({ data: { orderId } }) => {
    await assertAdmin()

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
