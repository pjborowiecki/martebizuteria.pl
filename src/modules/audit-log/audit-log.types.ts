import { type auditLog } from "~/src/modules/audit-log/audit-log.schema"

export interface AuditLogActor {
  readonly id?: string | undefined
  readonly initials: string
  readonly name: string
  readonly role: (typeof auditLog.$inferSelect)["actorRole"]
}

/** Admin audit table row. */
export interface AdminAuditListItem {
  readonly action: string
  readonly actor: AuditLogActor
  readonly category: (typeof auditLog.$inferSelect)["category"]
  readonly detail: string | undefined
  readonly id: string
  readonly ip: string | undefined
  readonly resourceId: string | undefined
  readonly severity: (typeof auditLog.$inferSelect)["severity"]
  readonly target: string
  readonly timestamp: string
}

export interface AuditLogStats {
  readonly errorCount: number
  readonly todayCount: number
  readonly totalCount: number
  readonly warningCount: number
}

export interface AuditLog {
  adminListItem: AdminAuditListItem
  insert: typeof auditLog.$inferInsert
  select: typeof auditLog.$inferSelect
  stats: AuditLogStats
}
