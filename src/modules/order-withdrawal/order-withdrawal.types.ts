import { type z } from "zod/v4"

import {
  type ORDER_WITHDRAWAL_OUTCOME,
  type OrderWithdrawalRejection,
  type OrderWithdrawalScope,
} from "~/src/modules/order-withdrawal/order-withdrawal.constants"
import { type orderWithdrawalZodSchemas } from "~/src/modules/order-withdrawal/order-withdrawal.zod"

interface OrderWithdrawalStatement {
  readonly consumerName: string
  readonly email: string
  readonly items: string | undefined
  readonly reason: string | undefined
  readonly scope: OrderWithdrawalScope
  readonly submittedAt: Date
}

interface RecordedOrderWithdrawal extends OrderWithdrawalStatement {
  readonly id: string
}

interface OrderWithdrawalReceipt {
  readonly acknowledged: boolean
  readonly email: string
  readonly submittedAt: Date
}

interface CustomerOrderWithdrawal {
  readonly canWithdraw: boolean
  readonly consumerName: string
  readonly email: string
  readonly statements: readonly RecordedOrderWithdrawal[]
}

type OrderWithdrawalRecording =
  | { readonly outcome: OrderWithdrawalRejection }
  | { readonly outcome: typeof ORDER_WITHDRAWAL_OUTCOME.RECORDED; readonly withdrawal: OrderWithdrawalStatement }

type OrderWithdrawalResult =
  | { readonly outcome: OrderWithdrawalRejection }
  | { readonly outcome: typeof ORDER_WITHDRAWAL_OUTCOME.RECORDED; readonly receipt: OrderWithdrawalReceipt }

export interface OrderWithdrawal {
  customerOrder: CustomerOrderWithdrawal
  customerFormValues: z.input<(typeof orderWithdrawalZodSchemas)["customerForm"]>
  guestFormValues: z.input<(typeof orderWithdrawalZodSchemas)["guestForm"]>
  receipt: OrderWithdrawalReceipt
  recorded: RecordedOrderWithdrawal
  recording: OrderWithdrawalRecording
  result: OrderWithdrawalResult
  statement: OrderWithdrawalStatement
}
