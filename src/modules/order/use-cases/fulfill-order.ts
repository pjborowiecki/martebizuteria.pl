import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { and, eq, isNull } from "drizzle-orm"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { recordOrderFulfillmentStartedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { assertOrderActionState, getAdminOrderActionRow, transitionOrder } from "~/src/modules/order/order.admin-action.server"
import { canFulfillAdminOrder } from "~/src/modules/order/order.admin-actions.utils"
import { FULFILLABLE_FULFILLMENT_STATUSES, ORDER_EMAIL_KIND, ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { announceClaimedOrderEmail } from "~/src/modules/order/order.email-delivery.server"
import { order } from "~/src/modules/order/order.schema"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { sendOrderInProgressEmail } from "~/src/modules/order/use-cases/send-order-in-progress-email.server"

import { resolveRequestOrigin } from "~/src/lib/request"

const claimInProgressEmail = async (orderId: string): Promise<boolean> => {
  const claimed = await db
    .update(order)
    .set({ inProgressEmailAt: new Date() })
    .where(and(eq(order.id, orderId), eq(order.fulfillmentStatus, "fulfilled"), isNull(order.inProgressEmailAt)))
    .returning({ id: order.id })

  return claimed.length > 0
}

export const fulfillOrder = createServerFn({ method: "POST" })
  .middleware([authorized({ order: ["update"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminOrderIdInput>) => orderZodSchemas.adminOrderIdInput.parse(input))
  .handler(async ({ data: { orderId } }) => {
    const origin = resolveRequestOrigin(getRequest())
    const row = assertOrderActionState(await getAdminOrderActionRow(orderId), (snapshot) =>
      canFulfillAdminOrder({ fulfillmentStatus: snapshot.fulfillmentStatus, paymentUiKey: "paid", status: snapshot.status }),
    )

    await transitionOrder(orderId, FULFILLABLE_FULFILLMENT_STATUSES, {
      fulfillmentStartedAt: new Date(),
      fulfillmentStatus: "fulfilled",
      status: row.status === "pending" ? "processing" : row.status,
    })

    recordOrderFulfillmentStartedAudit(orderId)
    const email = await announceClaimedOrderEmail(ORDER_EMAIL_KIND.IN_PROGRESS, await claimInProgressEmail(orderId), () =>
      sendOrderInProgressEmail(orderId, origin),
    )

    return { email, ok: true, orderId }
  })

export const fulfillOrderMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof fulfillOrder>[0]["data"]) => fulfillOrder({ data }),
  mutationKey: ORDER_MUTATION_KEYS.FULFILL,
})
