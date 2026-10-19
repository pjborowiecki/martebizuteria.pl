import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { sql } from "drizzle-orm"
import { type SQLiteUpdateSetSource } from "drizzle-orm/sqlite-core"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleAdminOrdersInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { recordOrderSteppedBackAudit } from "~/src/modules/audit-log/audit-log.events.server"
import {
  ADMIN_ORDER_FULFILLMENT_STATUSES_BY_STEP,
  ADMIN_ORDER_PREVIOUS_STEP,
  type AdminOrderAdvancedStep,
  ORDER_MUTATION_KEYS,
} from "~/src/modules/order/order.constants"
import { type order } from "~/src/modules/order/order.schema"
import { buildOrderStepBackAuditChange, resolveAdminOrderStepBack } from "~/src/modules/order/order.utils"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { assertOrderActionState, getAdminOrderActionRow, transitionOrder } from "~/src/modules/order/use-cases/transition-order.server"

const STEP_BACK_UPDATES = {
  delivered: { deliveredAt: sql`NULL`, fulfillmentStatus: "shipped", status: "processing" },
  processing: { fulfillmentStartedAt: sql`NULL`, fulfillmentStatus: "not_fulfilled" },
  shipped: { fulfillmentStatus: "fulfilled", shippedAt: sql`NULL` },
} as const satisfies Record<AdminOrderAdvancedStep, SQLiteUpdateSetSource<typeof order>>

export const stepBackOrder = createServerFn({ method: "POST" })
  .middleware([authorized({ order: ["update"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminStepBackOrderInput>) => orderZodSchemas.adminStepBackOrderInput.parse(input))
  .handler(async ({ data: { fromStep, orderId } }) => {
    const row = assertOrderActionState(
      await getAdminOrderActionRow(orderId),
      (snapshot) => resolveAdminOrderStepBack(snapshot)?.from === fromStep,
    )
    const update = STEP_BACK_UPDATES[fromStep]
    const toStep = ADMIN_ORDER_PREVIOUS_STEP[fromStep]

    await transitionOrder(orderId, ADMIN_ORDER_FULFILLMENT_STATUSES_BY_STEP[fromStep], update)

    recordOrderSteppedBackAudit(
      orderId,
      buildOrderStepBackAuditChange(
        { fulfillmentStep: fromStep, orderStatus: row.status },
        { fulfillmentStep: toStep, orderStatus: "status" in update ? update.status : row.status },
      ),
    )
    scheduleAdminOrdersInvalidation()

    return { ok: true, orderId, toStep } as const
  })

export const stepBackOrderMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof stepBackOrder>[0]["data"]) => stepBackOrder({ data }),
  mutationKey: ORDER_MUTATION_KEYS.STEP_BACK,
})
