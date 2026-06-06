import { CONSTANTS } from "~/src/constants";

import { publishRealtimeInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.publish.server";

import { auditLogAccessors, type AuditLogInsertRow } from "~/src/modules/audit-log/audit-log.accessors";
import type { AuditLogAction, AuditLogActorRole, AuditLogCategory, AuditLogSeverity } from "~/src/modules/audit-log/audit-log.constants";

export interface AuditLogQueueMessage {
  readonly action: AuditLogAction;
  readonly actorId?: string;
  readonly actorName: string;
  readonly actorRole: AuditLogActorRole;
  readonly category: AuditLogCategory;
  readonly createdAt: number;
  readonly detail?: string;
  readonly id: string;
  readonly ip?: string;
  readonly metadata?: string;
  readonly resourceId?: string;
  readonly severity: AuditLogSeverity;
  readonly target: string;
}

function toInsertRow(message: AuditLogQueueMessage): AuditLogInsertRow {
  return {
    action: message.action,
    actorId: message.actorId,
    actorName: message.actorName,
    actorRole: message.actorRole,
    category: message.category,
    createdAt: message.createdAt,
    detail: message.detail,
    id: message.id,
    ip: message.ip,
    metadata: message.metadata,
    resourceId: message.resourceId,
    severity: message.severity,
    target: message.target
  };
}

export async function processAuditLogQueueBatch(batch: MessageBatch<AuditLogQueueMessage>): Promise<void> {
  const rows = batch.messages.map((message) => toInsertRow(message.body));

  try {
    await auditLogAccessors.insertAuditLogs(rows);

    for (const message of batch.messages) {
      message.ack();
    }

    await publishRealtimeInvalidation({
      admin: [CONSTANTS.QUERY_KEYS.AUDIT_LOG.ADMIN.PAGE, CONSTANTS.QUERY_KEYS.AUDIT_LOG.ADMIN.STATS]
    });
  } catch (error) {
    console.error("[AuditLog Queue] Batch insert failed:", error);

    for (const message of batch.messages) {
      message.retry();
    }
  }
}
