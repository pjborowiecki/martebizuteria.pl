import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditEventOptions, type AuditLogActorInput } from "~/src/modules/audit-log/audit-log.types"
import { withResourceId } from "~/src/modules/audit-log/audit-log.utils"
import { scheduleAuditLogFromRequest, scheduleSystemAuditLog } from "~/src/modules/audit-log/use-cases/schedule-audit-log.server"

export const recordDiscountRedeemedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.DISCOUNT_REDEEMED,
    category: "orders",
    severity: "info",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderPlacedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_PLACED,
    category: "orders",
    severity: "success",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderPaymentCapturedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_PAYMENT_CAPTURED,
    category: "orders",
    severity: "success",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderFulfillmentStartedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ORDER_FULFILLMENT_STARTED,
    category: "orders",
    severity: "info",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderShippedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ORDER_SHIPPED,
    category: "orders",
    severity: "success",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderCancelledAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ORDER_CANCELLED,
    category: "orders",
    severity: "warning",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderRefundAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_REFUND_INITIATED,
    category: "orders",
    severity: "warning",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderRefundFailedAudit = (orderId: string, refundId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_REFUND_FAILED,
    category: "orders",
    id: `${AUDIT_LOG_ACTION.ORDER_REFUND_FAILED}:${refundId}`,
    severity: "warning",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderRefundRequestedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ORDER_REFUND_REQUESTED,
    category: "orders",
    severity: "warning",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderRestockedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ORDER_RESTOCKED,
    category: "orders",
    severity: "info",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderWithdrawalReceivedAudit = (orderId: string, consumer: AuditLogActorInput, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ORDER_WITHDRAWAL_RECEIVED,
    actor: consumer,
    category: "orders",
    severity: "warning",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderShipmentCreatedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ORDER_SHIPMENT_CREATED,
    category: "orders",
    severity: "info",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderReleasedAudit = (sessionId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_RELEASED,
    category: "orders",
    severity: "info",
    ...withResourceId(sessionId, options),
  })
}

export const recordOrderDeliveredAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ORDER_DELIVERED,
    category: "orders",
    severity: "info",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderSteppedBackAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ORDER_STEPPED_BACK,
    category: "orders",
    severity: "warning",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderTrackingUpdatedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleAuditLogFromRequest({
    action: AUDIT_LOG_ACTION.ORDER_TRACKING_UPDATED,
    category: "orders",
    severity: "info",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderPaymentFailedAudit = (paymentIntentId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_PAYMENT_FAILED,
    category: "orders",
    severity: "error",
    ...withResourceId(paymentIntentId, options),
  })
}

export const recordOrderFulfillmentFailedAudit = (sessionId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_FULFILLMENT_FAILED,
    category: "orders",
    id: `${AUDIT_LOG_ACTION.ORDER_FULFILLMENT_FAILED}:${sessionId}`,
    severity: "error",
    ...withResourceId(sessionId, options),
  })
}

export const recordOrderDisputeOpenedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_DISPUTE_OPENED,
    category: "orders",
    severity: "warning",
    ...withResourceId(orderId, options),
  })
}

export const recordOrderDisputeClosedAudit = (orderId: string, options?: AuditEventOptions): void => {
  scheduleSystemAuditLog({
    action: AUDIT_LOG_ACTION.ORDER_DISPUTE_CLOSED,
    category: "orders",
    severity: "info",
    ...withResourceId(orderId, options),
  })
}
