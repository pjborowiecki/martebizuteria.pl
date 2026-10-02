import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { stripe } from "~/src/integrations/stripe/stripe.server"
import { resolveStripeObjectId } from "~/src/integrations/stripe/stripe.utils"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { getAdminOrderRefundTarget } from "~/src/modules/order/order.accessors"
import { canRefundAdminOrder, resolveAdminOrderRefundBlocker } from "~/src/modules/order/order.admin-actions.utils"
import { ORDER_ERROR_CODES, ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { resolveAdminOrderDispute } from "~/src/modules/order/order.detail.utils"
import { resolveAdminOrderPaymentUiKey } from "~/src/modules/order/order.display.utils"
import { orderZodSchemas } from "~/src/modules/order/order.zod"

export const refundAdminOrder = createServerFn({ method: "POST" })
  .middleware([authorized({ order: ["update"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminOrderIdInput>) => orderZodSchemas.adminOrderIdInput.parse(input))
  .handler(async ({ data: { orderId } }) => {
    const target = await getAdminOrderRefundTarget(orderId)
    if (target === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND, ORDER_ERROR_CODES.NOT_FOUND)
    }

    const { transactionId } = target
    const refundable =
      canRefundAdminOrder({
        paymentUiKey: resolveAdminOrderPaymentUiKey(target.paymentStatus),
        status: target.status,
      }) &&
      resolveAdminOrderRefundBlocker({
        hasOpenDispute: resolveAdminOrderDispute(target.metadata) !== undefined,
        totalMinorUnits: target.total,
      }) === undefined

    if (!refundable || transactionId === null || transactionId === "") {
      throw new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE)
    }

    const session = await stripe.checkout.sessions.retrieve(transactionId)
    const paymentIntentId = resolveStripeObjectId(session.payment_intent)
    if (session.payment_status === "no_payment_required" || paymentIntentId === undefined) {
      throw new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE)
    }

    await stripe.refunds.create(
      {
        metadata: {
          orderId,
        },
        payment_intent: paymentIntentId,
      },
      { idempotencyKey: `admin-order-refund-${orderId}` },
    )

    return { ok: true, orderId }
  })

export const refundAdminOrderMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof refundAdminOrder>[0]["data"]) => refundAdminOrder({ data }),
  mutationKey: ORDER_MUTATION_KEYS.REFUND,
})
