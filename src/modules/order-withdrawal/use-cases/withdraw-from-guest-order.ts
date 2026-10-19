import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { and, eq } from "drizzle-orm"
import type * as zod from "zod"

import { RATE_LIMITS, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { PUBLIC_EMAIL_KINDS, admitPublicEmail } from "~/src/integrations/resend/resend.public-email-limits.server"

import {
  ORDER_WITHDRAWAL_MUTATION_KEYS,
  ORDER_WITHDRAWAL_OUTCOME,
  ORDER_WITHDRAWAL_SCOPE,
} from "~/src/modules/order-withdrawal/order-withdrawal.constants"
import { presentText } from "~/src/modules/order-withdrawal/order-withdrawal.utils"
import { orderWithdrawalZodSchemas } from "~/src/modules/order-withdrawal/order-withdrawal.zod"
import { recordOrderWithdrawal, sendOrderWithdrawalEmails } from "~/src/modules/order-withdrawal/use-cases/record-order-withdrawal.server"
import { orderReachableAt, orderRecipientEmail } from "~/src/modules/order/order.accessors"
import { order } from "~/src/modules/order/order.schema"

import { scheduleBackgroundWork } from "~/src/lib/background"
import { resolveRequestOrigin } from "~/src/lib/request"

export const withdrawFromGuestOrder = createServerFn({ method: "POST" })
  .middleware([withRateLimit("withdraw-from-guest-order", RATE_LIMITS.SENSITIVE)])
  .validator((input: zod.input<typeof orderWithdrawalZodSchemas.guestForm>) => orderWithdrawalZodSchemas.guestForm.parse(input))
  .handler(async ({ data }): Promise<void> => {
    const origin = resolveRequestOrigin(getRequest())
    const email = data.email.toLowerCase()
    const orderRow = await db.query.order.findFirst({
      columns: { deliveredAt: true, id: true, orderNumber: true, status: true },
      extras: { recipient: orderRecipientEmail().as("recipient") },
      where: and(eq(order.orderNumber, data.orderNumber), orderReachableAt(email)),
    })

    if (orderRow === undefined) {
      return
    }

    const recorded = await recordOrderWithdrawal({
      email: orderRow.recipient,
      order: orderRow,
      statement: {
        consumerName: data.consumerName,
        items: data.scope === ORDER_WITHDRAWAL_SCOPE.ITEMS ? data.items : undefined,
        reason: presentText(data.reason),
        scope: data.scope,
      },
    })

    if (
      recorded.outcome === ORDER_WITHDRAWAL_OUTCOME.RECORDED &&
      (await admitPublicEmail({ kind: PUBLIC_EMAIL_KINDS.WITHDRAWAL, to: orderRow.recipient }))
    ) {
      scheduleBackgroundWork(sendOrderWithdrawalEmails({ order: orderRow, origin, withdrawal: recorded.withdrawal }))
    }
  })

export const withdrawFromGuestOrderMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof withdrawFromGuestOrder>[0]["data"]) => withdrawFromGuestOrder({ data }),
  mutationKey: ORDER_WITHDRAWAL_MUTATION_KEYS.WITHDRAW_FROM_GUEST_ORDER,
})
