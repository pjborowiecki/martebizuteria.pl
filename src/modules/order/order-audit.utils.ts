import {
  buildAuditChangeMetadata,
  formatAuditDetailFromChanges,
  toAuditMetadataRecord
} from "~/src/modules/audit-log/audit-log.diff.utils";

export interface OrderAuditSnapshot {
  readonly orderStatus?: string;
  readonly paymentStatus: string;
  readonly refundedAmount?: number;
}

const ORDER_AUDIT_FIELD_LABELS = {
  orderStatus: "Order status",
  paymentStatus: "Payment status",
  refundedAmount: "Refunded amount"
} as const;

export function buildOrderRefundAuditChange(
  before: OrderAuditSnapshot,
  after: OrderAuditSnapshot
): { detail?: string; metadata?: Record<string, unknown> } {
  const metadata = buildAuditChangeMetadata(before, after, ["orderStatus", "paymentStatus", "refundedAmount"]);

  if (metadata === undefined) {
    return {};
  }

  return {
    detail: formatAuditDetailFromChanges(ORDER_AUDIT_FIELD_LABELS, metadata),
    metadata: toAuditMetadataRecord(metadata)
  };
}
