import { type AuditEmailKind } from "~/src/modules/audit-log/audit-log.constants"
import { type auditLog } from "~/src/modules/audit-log/audit-log.schema"

interface AuditLogActor {
  readonly id?: string | undefined
  readonly initials: string
  readonly name: string
  readonly role: (typeof auditLog.$inferSelect)["actorRole"]
}

interface AuditLogTextDetail {
  readonly kind: "text"
  readonly text: string
}

interface AuditLogEmailDetail {
  readonly dailyLimit?: number | undefined
  readonly emailKind: AuditEmailKind
  readonly failure?: string | undefined
  readonly kind: "email"
  readonly recipient?: string | undefined
}

interface AuditLogMessageDetail {
  readonly kind: "message"
  readonly message: "cartItemCount" | "recipientCount" | "stripeCustomerKept"
  readonly values: Readonly<Record<string, number | string>>
}

interface AuditLogAmountValue {
  readonly field: "amount"
  readonly value: number
}

interface AuditLogCodeValue {
  readonly field: "disputeReason" | "disputeStatus" | "role"
  readonly value: string
}

type AuditLogValue = AuditLogAmountValue | AuditLogCodeValue

interface AuditLogValuesDetail {
  readonly kind: "values"
  readonly values: readonly AuditLogValue[]
}

type AuditLogDetail = AuditLogEmailDetail | AuditLogMessageDetail | AuditLogTextDetail | AuditLogValuesDetail

interface AdminAuditListItem extends Pick<typeof auditLog.$inferSelect, "action" | "category" | "id" | "severity"> {
  readonly actor: AuditLogActor
  readonly detail: AuditLogDetail | undefined
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
  detail: AuditLogDetail
  detailValue: AuditLogValue
  emailDetail: AuditLogEmailDetail
  insert: typeof auditLog.$inferInsert
  select: typeof auditLog.$inferSelect
  stats: AuditLogStats
}
