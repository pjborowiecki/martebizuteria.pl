import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { and, eq, isNull } from "drizzle-orm"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { recordOrderDeliveredAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { assertOrderActionState, getAdminOrderActionRow, transitionOrder } from "~/src/modules/order/order.admin-action.server"
import { canMarkAdminOrderDelivered } from "~/src/modules/order/order.admin-actions.utils"
import { ORDER_EMAIL_KIND, ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { announceClaimedOrderEmail } from "~/src/modules/order/order.email-delivery.server"
import { order } from "~/src/modules/order/order.schema"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { sendOrderDeliveredEmail } from "~/src/modules/order/use-cases/send-order-delivered-email.server"

import { resolveRequestOrigin } from "~/src/lib/request"

const claimDeliveredEmail = async (orderId: string): Promise<boolean> => {
  const claimed = await db
    .update(order)
    .set({ deliveredEmailAt: new Date() })
    .where(and(eq(order.id, orderId), eq(order.fulfillmentStatus, "delivered"), isNull(order.deliveredEmailAt)))
    .returning({ id: order.id })

  return claimed.length > 0
}

export const markOrderDelivered = createServerFn({ method: "POST" })
  .middleware([authorized({ order: ["update"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminOrderIdInput>) => orderZodSchemas.adminOrderIdInput.parse(input))
  .handler(async ({ data: { orderId } }) => {
    const origin = resolveRequestOrigin(getRequest())
    assertOrderActionState(await getAdminOrderActionRow(orderId), (snapshot) =>
      canMarkAdminOrderDelivered({ fulfillmentStatus: snapshot.fulfillmentStatus, status: snapshot.status }),
    )

    await transitionOrder(orderId, ["shipped"], {
      deliveredAt: new Date(),
      fulfillmentStatus: "delivered",
      status: "completed",
    })

    recordOrderDeliveredAudit(orderId)
    const email = await announceClaimedOrderEmail(ORDER_EMAIL_KIND.DELIVERED, await claimDeliveredEmail(orderId), () =>
      sendOrderDeliveredEmail(orderId, origin),
    )

    return { email, ok: true, orderId }
  })

export const markOrderDeliveredMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof markOrderDelivered>[0]["data"]) => markOrderDelivered({ data }),
  mutationKey: ORDER_MUTATION_KEYS.MARK_DELIVERED,
})
