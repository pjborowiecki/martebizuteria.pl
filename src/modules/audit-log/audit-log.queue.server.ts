import { type AuditLogInsertRow, insertAuditLogs } from "~/src/modules/audit-log/audit-log.accessors"
import {
  AUDIT_LOG_QUERY_KEYS,
  type AuditLogAction,
  type AuditLogActorRole,
  type AuditLogCategory,
  type AuditLogSeverity,
} from "~/src/modules/audit-log/audit-log.constants"

import { publishRealtimeInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.publish.server"

export interface AuditLogQueueMessage {
  readonly action: AuditLogAction
  readonly actorId?: string | undefined
  readonly actorName: string
  readonly actorRole: AuditLogActorRole
  readonly category: AuditLogCategory
  readonly createdAt: number
  readonly detail?: string | undefined
  readonly id: string
  readonly ip?: string | undefined
  readonly metadata?: string | undefined
  readonly resourceId?: string | undefined
  readonly severity: AuditLogSeverity
  readonly target: string
}

const toInsertRow = (message: AuditLogQueueMessage): AuditLogInsertRow => ({
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
  target: message.target,
})

export const processAuditLogQueueBatch = async (batch: MessageBatch<AuditLogQueueMessage>): Promise<void> => {
  const rows = batch.messages.map((message) => toInsertRow(message.body))

  try {
    await insertAuditLogs(rows)

    for (const message of batch.messages) {
      message.ack()
    }

    await publishRealtimeInvalidation({
      admin: [AUDIT_LOG_QUERY_KEYS.ADMIN.PAGE, AUDIT_LOG_QUERY_KEYS.ADMIN.STATS],
    })
  } catch (error) {
    console.error("[AuditLog Queue] Batch insert failed:", error)

    for (const message of batch.messages) {
      message.retry()
    }
  }
}
