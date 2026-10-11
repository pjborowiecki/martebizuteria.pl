import { polishDeadlineDay, toPolishCalendarDay } from "~/src/modules/_core/utils/polish-deadline"
import {
  ORDER_WITHDRAWAL_PERIOD_DAYS,
  ORDER_WITHDRAWAL_SCOPE,
  WITHDRAWABLE_ORDER_STATUSES,
} from "~/src/modules/order-withdrawal/order-withdrawal.constants"
import { type OrderWithdrawal } from "~/src/modules/order-withdrawal/order-withdrawal.types"
import { type Order } from "~/src/modules/order/order.types"

export const isOrderWithdrawalOpen = (
  { deliveredAt, status }: Readonly<Pick<Order["select"], "deliveredAt" | "status">>,
  now: Date,
): boolean =>
  WITHDRAWABLE_ORDER_STATUSES.some((withdrawable) => withdrawable === status) &&
  (deliveredAt === null || toPolishCalendarDay(now).getTime() <= polishDeadlineDay(deliveredAt, ORDER_WITHDRAWAL_PERIOD_DAYS).getTime())

export const coversWholeOrder = (withdrawals: readonly Pick<OrderWithdrawal["statement"], "scope">[]): boolean =>
  withdrawals.some(({ scope }) => scope === ORDER_WITHDRAWAL_SCOPE.ORDER)

export const describeWithdrawnItems = (lines: readonly WithdrawnLine[]): string =>
  lines
    .map(({ quantity, title, variantTitle }) => `${variantTitle === null ? title : `${title} — ${variantTitle}`} × ${String(quantity)}`)
    .join("\n")

export const presentText = (value: string): string | undefined => (value === "" ? undefined : value)

interface WithdrawnLine {
  readonly quantity: number
  readonly title: string
  readonly variantTitle: string | null
}
