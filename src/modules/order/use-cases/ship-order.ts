import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"
import { scheduleBackgroundWork } from "~/src/integrations/better-auth/auth.background"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { notifyOrderShipped } from "~/src/integrations/resend/order-shipped.notification.server"

import { recordOrderShippedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { assertOrderActionState, getAdminOrderActionRow } from "~/src/modules/order/order.admin-action.server"
import { canMarkAdminOrderShipped } from "~/src/modules/order/order.admin-actions.utils"
import { order } from "~/src/modules/order/order.schema"
import { orderZodSchemas } from "~/src/modules/order/order.zod"

export const markAdminOrderShippedFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => orderZodSchemas.adminOrderIdInput.parse(data))
  .handler(async ({ data: { orderId } }) => {
    await assertAdmin()

    assertOrderActionState(await getAdminOrderActionRow(orderId), (snapshot) =>
      canMarkAdminOrderShipped({ fulfillmentStatus: snapshot.fulfillmentStatus, paymentUiKey: "paid", status: snapshot.status }),
    )

    await db
      .update(order)
      .set({
        fulfillmentStatus: "shipped",
        shippedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(order.id, orderId))

    recordOrderShippedAudit(orderId)
    scheduleBackgroundWork(notifyOrderShipped(orderId))

    return { ok: true, orderId }
  })
