import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import type * as zod from "zod"

import { hasPermission } from "~/src/integrations/better-auth/auth.access"
import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { scheduleProductCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"
import { notifyOrderCancelled } from "~/src/integrations/resend/order-cancelled.notification.server"

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

import { scheduleBackgroundWork } from "~/src/lib/background"
import { resolveRequestOrigin } from "~/src/lib/request"

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([authorized({ order: ["update"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminOrderIdInput>) => orderZodSchemas.adminOrderIdInput.parse(input))
  .handler(async ({ context, data: { orderId } }) => {
    const origin = resolveRequestOrigin(getRequest())
    const target = assertOrderActionState(await getAdminOrderRefundTarget(orderId), canCancelAdminOrder)
    const paymentUiKey = resolveAdminOrderPaymentUiKey(target.paymentStatus)
    const refundsPayment = cancelRefundsAdminOrderPayment({ paymentUiKey, totalMinorUnits: target.total })
    if (refundsPayment && !hasPermission({ permission: { order: ["refund"] }, role: context.auth.user.role })) {
      throw new AppError(ERROR_CODES.FORBIDDEN)
    }

    const orderLines = await getRestockLinesForOrder(orderId)
    const restockLines = orderLines.filter(
      (
        line,
      ): line is {
        quantity: number
        variantId: string
      } => line.variantId !== null,
    )

    const refundedAmount = refundsPayment ? await requestFullOrderRefund(orderId, target) : undefined

    const [first, ...rest] = prepareCancelOrderBatch(orderId, restockLines)
    const results = await db.batch([first, ...rest])
    scheduleProductCatalogInvalidation()
    const cancelled: unknown = results.at(-1)
    if (!Array.isArray(cancelled) || cancelled.length === 0) {
      throw new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE)
    }

    recordOrderCancelledAudit(orderId)
    const cancelledEmailDelivery = notifyOrderCancelled({ orderId, refundedAmount }, origin)
    scheduleBackgroundWork(cancelledEmailDelivery)
    const cancelledEmailSent = await cancelledEmailDelivery

    return { cancelledEmailSent, ok: true, orderId }
  })

export const cancelOrderMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof cancelOrder>[0]["data"]) => cancelOrder({ data }),
  mutationKey: ORDER_MUTATION_KEYS.CANCEL,
})
