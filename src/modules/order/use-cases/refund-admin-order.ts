import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { getAdminOrderRefundTarget } from "~/src/modules/order/order.accessors"
import { ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { canRefundAdminOrder, resolveAdminOrderPaymentUiKey } from "~/src/modules/order/order.utils"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { requestFullOrderRefund } from "~/src/modules/order/use-cases/request-full-order-refund.server"
import { returnOrderToStock } from "~/src/modules/order/use-cases/return-order-to-stock.server"
import { assertOrderActionState } from "~/src/modules/order/use-cases/transition-order.server"

export const refundAdminOrder = createServerFn({ method: "POST" })
  .middleware([authorized({ order: ["update", "refund"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminRefundOrderInput>) => orderZodSchemas.adminRefundOrderInput.parse(input))
  .handler(async ({ data: { orderId, restock } }) => {
    const target = assertOrderActionState(await getAdminOrderRefundTarget(orderId), (snapshot) =>
      canRefundAdminOrder({ paymentUiKey: resolveAdminOrderPaymentUiKey(snapshot.paymentStatus), status: snapshot.status }),
    )
    await requestFullOrderRefund(orderId, target)
    if (restock) {
      await returnOrderToStock(orderId)
    }

    return { ok: true, orderId }
  })

export const refundAdminOrderMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof refundAdminOrder>[0]["data"]) => refundAdminOrder({ data }),
  mutationKey: ORDER_MUTATION_KEYS.REFUND,
})
