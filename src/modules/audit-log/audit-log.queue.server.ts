import { publishRealtimeInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.publish.server"

import { type AuditLogInsertRow, insertAuditLogs } from "~/src/modules/audit-log/audit-log.accessors"
import {
  AUDIT_LOG_QUERY_KEYS,
  type AuditLogAction,
  type AuditLogActorRole,
  type AuditLogCategory,
  type AuditLogSeverity,
} from "~/src/modules/audit-log/audit-log.constants"
import { ADMIN_ORDER_TIMELINE_ACTIONS, ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"

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

const ORDER_TIMELINE_ACTIONS: ReadonlySet<AuditLogAction> = new Set(ADMIN_ORDER_TIMELINE_ACTIONS)

const AUDIT_LOG_ADMIN_QUERY_KEYS = [AUDIT_LOG_QUERY_KEYS.ADMIN.PAGE, AUDIT_LOG_QUERY_KEYS.ADMIN.STATS] as const

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

    const changesOrderTimeline = batch.messages.some((message) => ORDER_TIMELINE_ACTIONS.has(message.body.action))
    await publishRealtimeInvalidation({
      admin: changesOrderTimeline ? [...AUDIT_LOG_ADMIN_QUERY_KEYS, ORDER_QUERY_KEYS.ADMIN.ORDERS] : AUDIT_LOG_ADMIN_QUERY_KEYS,
    })
  } catch (error) {
    console.error("[AuditLog Queue] Batch insert failed:", error)

    for (const message of batch.messages) {
      message.retry()
    }
  }
}
