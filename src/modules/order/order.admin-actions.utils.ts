import { INPOST_CANCELED_SHIPMENT_STATUS } from "~/src/integrations/inpost/inpost.constants"

import { INPOST_COURIER_CODE } from "~/src/modules/courier/courier.constants"
import { type DeliveryMethodType } from "~/src/modules/delivery-method/delivery-method.constants"
import {
  ADMIN_ORDER_ADVANCED_STEPS,
  ADMIN_ORDER_CANCEL_BLOCKER,
  ADMIN_ORDER_FULFILLMENT_STATUSES_BY_STEP,
  ADMIN_ORDER_PREVIOUS_STEP,
  ADMIN_ORDER_REFUND_BLOCKER,
  type AdminOrderCancelBlocker,
  type AdminOrderRefundBlocker,
  CANCELLED_ORDER_STATUSES,
  DISPATCHED_FULFILLMENT_STATUSES,
  FULFILLABLE_FULFILLMENT_STATUSES,
  INPOST_DELIVERY_TYPES,
  type InpostDeliveryType,
  OPEN_ORDER_STATUSES,
  SHIPPABLE_FULFILLMENT_STATUSES,
} from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

export const isInpostDelivery = (delivery: Readonly<InpostDeliverySource>): delivery is InpostDelivery =>
  delivery.courierCode === INPOST_COURIER_CODE &&
  delivery.type !== undefined &&
  (INPOST_DELIVERY_TYPES as readonly string[]).includes(delivery.type)

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

export const canSetAdminOrderTrackingNumber = ({
  fulfillmentStatus,
  status,
}: Pick<OrderActionSnapshot, "fulfillmentStatus" | "status">): boolean => !isCancelledOrderStatus(status) && fulfillmentStatus === "shipped"

export const resolveAdminOrderStepBack = ({
  fulfillmentStatus,
  status,
}: Pick<OrderActionSnapshot, "fulfillmentStatus" | "status">): Order["stepBack"] | undefined => {
  if (isCancelledOrderStatus(status)) {
    return undefined
  }

  const from = ADMIN_ORDER_ADVANCED_STEPS.find((step) =>
    (ADMIN_ORDER_FULFILLMENT_STATUSES_BY_STEP[step] as readonly string[]).includes(fulfillmentStatus),
  )

  return from === undefined ? undefined : { from, to: ADMIN_ORDER_PREVIOUS_STEP[from] }
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

export const resolveAdminOrderCancelBlocker = ({
  hasOpenDispute,
  paymentUiKey,
  totalMinorUnits,
}: AdminOrderCancelBlockerSnapshot): AdminOrderCancelBlocker | undefined =>
  hasOpenDispute && cancelRefundsAdminOrderPayment({ paymentUiKey, totalMinorUnits }) ? ADMIN_ORDER_CANCEL_BLOCKER.OPEN_DISPUTE : undefined

export const canPrintAdminOrderSummary = ({ status }: Pick<OrderActionSnapshot, "status">): boolean => status !== "cancelled"

const holdsLiveInpostShipment = ({
  inpostShipmentId,
  inpostShipmentStatus,
}: Pick<InpostShipmentSnapshot, "inpostShipmentId" | "inpostShipmentStatus">): boolean =>
  inpostShipmentId !== undefined && inpostShipmentStatus !== INPOST_CANCELED_SHIPMENT_STATUS

export const canCreateAdminOrderInpostShipment = (snapshot: InpostShipmentSnapshot): boolean =>
  !holdsLiveInpostShipment(snapshot) &&
  isInpostDelivery({ courierCode: snapshot.courierCode, type: snapshot.deliveryType }) &&
  (OPEN_ORDER_STATUSES as readonly string[]).includes(snapshot.status) &&
  !isDispatchedFulfillmentStatus(snapshot.fulfillmentStatus)

const TERMINAL_FULFILLMENT_STATUSES = ["shipped", "delivered", "cancelled"] as const

type OrderActionSnapshot = Pick<Order["adminListItem"], "fulfillmentStatus" | "paymentUiKey" | "status">

export interface InpostDeliverySource {
  readonly courierCode: string | undefined
  readonly type: DeliveryMethodType | undefined
}

interface InpostDelivery extends InpostDeliverySource {
  readonly type: InpostDeliveryType
}

interface InpostShipmentSnapshot extends Pick<OrderActionSnapshot, "fulfillmentStatus" | "status"> {
  readonly courierCode: string | undefined
  readonly deliveryType: DeliveryMethodType | undefined
  readonly inpostShipmentId: string | undefined
  readonly inpostShipmentStatus: string | undefined
}

interface AdminOrderRefundBlockerSnapshot {
  readonly hasOpenDispute: boolean
  readonly totalMinorUnits: number
}

interface AdminOrderCancelBlockerSnapshot extends AdminOrderRefundBlockerSnapshot {
  readonly paymentUiKey: Order["adminListItem"]["paymentUiKey"]
}
