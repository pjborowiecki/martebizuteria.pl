import {
  ADMIN_ORDER_REFUND_BLOCKER,
  type AdminOrderRefundBlocker,
  CANCELLED_ORDER_STATUSES,
  DISPATCHED_FULFILLMENT_STATUSES,
  OPEN_ORDER_STATUSES,
} from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

const isCancelledOrderStatus = (status: Order["select"]["status"]): boolean =>
  (CANCELLED_ORDER_STATUSES as readonly string[]).includes(status)

const isDispatchedFulfillmentStatus = (fulfillmentStatus: Order["select"]["fulfillmentStatus"]): boolean =>
  (DISPATCHED_FULFILLMENT_STATUSES as readonly string[]).includes(fulfillmentStatus)

export const canFulfillAdminOrder = ({ fulfillmentStatus, status }: OrderActionSnapshot): boolean => {
  if (isCancelledOrderStatus(status)) {
    return false
  }

  return (FULFILLABLE_FULFILLMENT_STATUSES as readonly string[]).includes(fulfillmentStatus)
}

export const canMarkAdminOrderShipped = ({ fulfillmentStatus, status }: OrderActionSnapshot): boolean => {
  if (isCancelledOrderStatus(status)) {
    return false
  }

  if ((TERMINAL_FULFILLMENT_STATUSES as readonly string[]).includes(fulfillmentStatus)) {
    return false
  }

  return (SHIPPABLE_FULFILLMENT_STATUSES as readonly string[]).includes(fulfillmentStatus)
}

export const canMarkAdminOrderDelivered = ({
  fulfillmentStatus,
  status,
}: Pick<OrderActionSnapshot, "fulfillmentStatus" | "status">): boolean => {
  if (isCancelledOrderStatus(status)) {
    return false
  }

  return fulfillmentStatus === "shipped"
}

export const canCancelAdminOrder = ({ fulfillmentStatus, status }: Pick<OrderActionSnapshot, "fulfillmentStatus" | "status">): boolean =>
  (OPEN_ORDER_STATUSES as readonly string[]).includes(status) && !isDispatchedFulfillmentStatus(fulfillmentStatus)

export const cancelRefundsAdminOrderPayment = ({
  paymentUiKey,
  totalMinorUnits,
}: Pick<Order["adminListItem"], "paymentUiKey" | "totalMinorUnits">): boolean => paymentUiKey === "paid" && totalMinorUnits > 0

export const canRefundAdminOrder = ({ paymentUiKey, status }: Pick<OrderActionSnapshot, "paymentUiKey" | "status">): boolean =>
  paymentUiKey === "paid" && status !== "refunded" && status !== "cancelled"

export const refundRestocksByDefault = ({ fulfillmentStatus }: Pick<OrderActionSnapshot, "fulfillmentStatus">): boolean =>
  !isDispatchedFulfillmentStatus(fulfillmentStatus)

export const canRestockAdminOrder = ({ restockedAt, status }: Pick<Order["adminOrderDetail"], "restockedAt" | "status">): boolean =>
  status === "refunded" && restockedAt === undefined

export const resolveAdminOrderRefundBlocker = ({
  hasOpenDispute,
  totalMinorUnits,
}: AdminOrderRefundBlockerSnapshot): AdminOrderRefundBlocker | undefined => {
  if (totalMinorUnits <= 0) {
    return ADMIN_ORDER_REFUND_BLOCKER.NO_STRIPE_PAYMENT
  }

  if (hasOpenDispute) {
    return ADMIN_ORDER_REFUND_BLOCKER.OPEN_DISPUTE
  }

  return undefined
}

export const canPrintAdminOrderSummary = ({ status }: Pick<OrderActionSnapshot, "status">): boolean => status !== "cancelled"

const FULFILLABLE_FULFILLMENT_STATUSES = ["not_fulfilled", "partially_fulfilled"] as const

const SHIPPABLE_FULFILLMENT_STATUSES = ["fulfilled", "partially_fulfilled"] as const

const TERMINAL_FULFILLMENT_STATUSES = ["shipped", "delivered", "cancelled"] as const

type OrderActionSnapshot = Pick<Order["adminListItem"], "fulfillmentStatus" | "paymentUiKey" | "status">

interface AdminOrderRefundBlockerSnapshot {
  readonly hasOpenDispute: boolean
  readonly totalMinorUnits: number
}
