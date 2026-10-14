import { buildAuditChangeMetadata, toAuditMetadataRecord } from "~/src/modules/audit-log/audit-log.diff.utils"
import { type Order } from "~/src/modules/order/order.types"

export const buildOrderRefundAuditChange = (
  before: Order["auditSnapshot"],
  after: Order["auditSnapshot"],
): {
  metadata?: Record<string, unknown>
} => {
  const metadata = buildAuditChangeMetadata(before, after, ["orderStatus", "paymentStatus", "refundedAmount"])
  if (metadata === undefined) {
    return {}
  }

  return {
    metadata: toAuditMetadataRecord(metadata),
  }
}
