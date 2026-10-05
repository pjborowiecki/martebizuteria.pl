import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { assertOrderActionState } from "~/src/modules/order/order.admin-action.server"
import { canRestockAdminOrder } from "~/src/modules/order/order.admin-actions.utils"
import { ORDER_ERROR_CODES, ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { returnOrderToStock } from "~/src/modules/order/order.restock.server"
import { order } from "~/src/modules/order/order.schema"
import { orderZodSchemas } from "~/src/modules/order/order.zod"

export const restockOrder = createServerFn({ method: "POST" })
  .middleware([authorized({ order: ["update"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminOrderIdInput>) => orderZodSchemas.adminOrderIdInput.parse(input))
  .handler(async ({ data: { orderId } }) => {
    const restockTarget = await db.query.order.findFirst({
      columns: {
        fulfillmentStatus: true,
        restockedAt: true,
        status: true,
      },
      where: eq(order.id, orderId),
    })
    assertOrderActionState(restockTarget, (snapshot) =>
      canRestockAdminOrder({ restockedAt: snapshot.restockedAt ?? undefined, status: snapshot.status }),
    )

    if (!(await returnOrderToStock(orderId))) {
      throw new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE)
    }

    return { ok: true, orderId }
  })

export const restockOrderMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof restockOrder>[0]["data"]) => restockOrder({ data }),
  mutationKey: ORDER_MUTATION_KEYS.RESTOCK,
})
