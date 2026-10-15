import { type AuditChangeMetadata, buildAuditChangeMetadata, toAuditMetadataRecord } from "~/src/modules/audit-log/audit-log.diff.utils"
import { type AdminOrderFulfillmentStepKey } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

const toOrderAuditChange = (
  metadata: AuditChangeMetadata<object, object> | undefined,
): {
  metadata?: Record<string, unknown>
} => (metadata === undefined ? {} : { metadata: toAuditMetadataRecord(metadata) })

export const buildOrderRefundAuditChange = (
  before: Order["auditSnapshot"],
  after: Order["auditSnapshot"],
): {
  metadata?: Record<string, unknown>
} => toOrderAuditChange(buildAuditChangeMetadata(before, after, ["orderStatus", "paymentStatus", "refundedAmount"]))

export const buildOrderStepBackAuditChange = (
  before: OrderStepSnapshot,
  after: OrderStepSnapshot,
): {
  metadata?: Record<string, unknown>
} => toOrderAuditChange(buildAuditChangeMetadata(before, after, ["fulfillmentStep", "orderStatus"]))

interface OrderStepSnapshot {
  readonly fulfillmentStep: AdminOrderFulfillmentStepKey
  readonly orderStatus: Order["select"]["status"]
}
