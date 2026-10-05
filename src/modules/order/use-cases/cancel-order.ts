import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { scheduleProductCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { recordOrderCancelledAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { getAdminOrderRefundTarget, getRestockLinesForOrder } from "~/src/modules/order/order.accessors"
import { assertOrderActionState } from "~/src/modules/order/order.admin-action.server"
import { canCancelAdminOrder, cancelRefundsAdminOrderPayment } from "~/src/modules/order/order.admin-actions.utils"
import { ORDER_ERROR_CODES, ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { resolveAdminOrderPaymentUiKey } from "~/src/modules/order/order.display.utils"
import { requestFullOrderRefund } from "~/src/modules/order/order.refund.server"
import { prepareCancelOrderBatch } from "~/src/modules/order/order.utils"
import { orderZodSchemas } from "~/src/modules/order/order.zod"

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([authorized({ order: ["update"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminOrderIdInput>) => orderZodSchemas.adminOrderIdInput.parse(input))
  .handler(async ({ data: { orderId } }) => {
    const target = assertOrderActionState(await getAdminOrderRefundTarget(orderId), canCancelAdminOrder)
    const orderLines = await getRestockLinesForOrder(orderId)
    const restockLines = orderLines.filter(
      (
        line,
      ): line is {
        quantity: number
        variantId: string
      } => line.variantId !== null,
    )

    const paymentUiKey = resolveAdminOrderPaymentUiKey(target.paymentStatus)
    if (cancelRefundsAdminOrderPayment({ paymentUiKey, totalMinorUnits: target.total })) {
      await requestFullOrderRefund(orderId, target)
    }

    const [first, ...rest] = prepareCancelOrderBatch(orderId, restockLines)
    const results = await db.batch([first, ...rest])
    const cancelled: unknown = results.at(-1)
    if (!Array.isArray(cancelled) || cancelled.length === 0) {
      throw new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE)
    }

    recordOrderCancelledAudit(orderId)
    scheduleProductCatalogInvalidation()

    return { ok: true, orderId }
  })

export const cancelOrderMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof cancelOrder>[0]["data"]) => cancelOrder({ data }),
  mutationKey: ORDER_MUTATION_KEYS.CANCEL,
})
