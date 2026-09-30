import { type auditLog } from "~/src/modules/audit-log/audit-log.schema"

interface AuditLogActor {
  readonly id?: string | undefined
  readonly initials: string
  readonly name: string
  readonly role: (typeof auditLog.$inferSelect)["actorRole"]
}

interface AdminAuditListItem extends Pick<typeof auditLog.$inferSelect, "action" | "category" | "id" | "severity"> {
  readonly actor: AuditLogActor
  readonly detail: string | undefined
  readonly ip: string | undefined
  readonly resourceId: string | undefined
  readonly target: string
  readonly timestamp: string
}

interface AuditLogStats {
  readonly errorCount: number
  readonly todayCount: number
  readonly totalCount: number
  readonly warningCount: number
}

export interface AuditLog {
  actor: AuditLogActor
  adminListItem: AdminAuditListItem
  insert: typeof auditLog.$inferInsert
  select: typeof auditLog.$inferSelect
  stats: AuditLogStats
}
