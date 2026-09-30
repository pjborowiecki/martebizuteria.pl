import { buildAuditChangeMetadata, formatAuditDetailFromChanges, toAuditMetadataRecord } from "~/src/modules/audit-log/audit-log.diff.utils"
import { type Order } from "~/src/modules/order/order.types"

export const buildOrderRefundAuditChange = (
  before: Order["auditSnapshot"],
  after: Order["auditSnapshot"],
): {
  detail?: string
  metadata?: Record<string, unknown>
} => {
  const metadata = buildAuditChangeMetadata(before, after, ["orderStatus", "paymentStatus", "refundedAmount"])
  if (metadata === undefined) {
    return {}
  }

  return {
    detail: formatAuditDetailFromChanges(ORDER_AUDIT_FIELD_LABELS, metadata),
    metadata: toAuditMetadataRecord(metadata),
  }
}

const ORDER_AUDIT_FIELD_LABELS = {
  orderStatus: "Order status",
  paymentStatus: "Payment status",
  refundedAmount: "Refunded amount",
} as const
