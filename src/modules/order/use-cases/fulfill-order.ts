import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { recordOrderFulfillmentStartedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { assertOrderActionState, getAdminOrderActionRow } from "~/src/modules/order/order.admin-action.server"
import { canFulfillAdminOrder } from "~/src/modules/order/order.admin-actions.utils"
import { order } from "~/src/modules/order/order.schema"
import { orderZodSchemas } from "~/src/modules/order/order.zod"

export const fulfillAdminOrderFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => orderZodSchemas.adminOrderIdInput.parse(data))
  .handler(async ({ data: { orderId } }) => {
    await assertAdmin()

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
