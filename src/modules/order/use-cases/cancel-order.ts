import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"
import { scheduleProductCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { recordOrderCancelledAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { getRestockLinesForOrder } from "~/src/modules/order/order.accessors"
import { assertOrderActionState, getAdminOrderActionRow } from "~/src/modules/order/order.admin-action.server"
import { canCancelAdminOrder } from "~/src/modules/order/order.admin-actions.utils"
import { ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { prepareCancelOrderBatch } from "~/src/modules/order/order.utils"
import { orderZodSchemas } from "~/src/modules/order/order.zod"

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([authorized({ order: ["update"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminOrderIdInput>) => orderZodSchemas.adminOrderIdInput.parse(input))
  .handler(async ({ data: { orderId } }) => {
    assertOrderActionState(await getAdminOrderActionRow(orderId), (snapshot) => canCancelAdminOrder({ status: snapshot.status }))

    const orderLines = await getRestockLinesForOrder(orderId)
    const restockLines = orderLines.filter(
      (
        line,
      ): line is {
        quantity: number
        variantId: string
      } => line.variantId !== null,
    )
    await runDrizzleBatch(prepareCancelOrderBatch(orderId, restockLines))

    recordOrderCancelledAudit(orderId)
    scheduleProductCatalogInvalidation()

    return { ok: true, orderId }
  })

export const cancelOrderMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof cancelOrder>[0]["data"]) => cancelOrder({ data }),
  mutationKey: ORDER_MUTATION_KEYS.CANCEL,
})
