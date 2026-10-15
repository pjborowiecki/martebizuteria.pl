import type StripeType from "stripe"

import { stripe } from "~/src/integrations/stripe/stripe.server"

const REFUNDS_PAGE_SIZE = 100

const REFUNDS_PER_PAYMENT_MAX = 1000

const UNDONE_REFUND_STATUSES = ["canceled", "failed"] as const

export const isUndoneRefund = <TRefund extends Pick<StripeType.Refund, "status">>(
  refund: TRefund,
): refund is TRefund & { readonly status: (typeof UNDONE_REFUND_STATUSES)[number] } =>
  UNDONE_REFUND_STATUSES.some((status) => status === refund.status)

export const listRefunds = (filter: Pick<StripeType.RefundListParams, "charge" | "payment_intent">): Promise<StripeType.Refund[]> =>
  stripe.refunds.list({ ...filter, limit: REFUNDS_PAGE_SIZE }).autoPagingToArray({ limit: REFUNDS_PER_PAYMENT_MAX })

export const readStandingRefunds = async (chargeId: string): Promise<StandingRefunds> => {
  const refunds = await listRefunds({ charge: chargeId })
  const standing = refunds.filter((refund) => !isUndoneRefund(refund))

  return { latestId: standing[0]?.id, total: standing.reduce((total, { amount }) => total + amount, 0) }
}

interface StandingRefunds {
  readonly latestId: string | undefined
  readonly total: number
}
