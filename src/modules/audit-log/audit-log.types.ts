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
  readonly message: "cartItemCount" | "claimedOrderCount" | "recipientCount" | "stripeCustomerKept"
  readonly values: Readonly<Record<string, number | string>>
}

interface AuditLogValue {
  readonly field: string
  readonly value: number | string
}

interface AuditLogValuesDetail {
  readonly kind: "values"
  readonly values: readonly AuditLogValue[]
}

interface AuditLogFieldChange {
  readonly field: string
  readonly from: number | string | undefined
  readonly to: number | string | undefined
}

interface AuditLogValueMove {
  readonly from: number
  readonly to: number
}

type AuditLogVariantChange =
  | {
      readonly change: "added" | "removed"
      readonly sku: string
    }
  | {
      readonly change: "updated"
      readonly price: AuditLogValueMove | undefined
      readonly quantity: AuditLogValueMove | undefined
      readonly sku: string
    }

interface AuditLogVariantsChange {
  readonly field: "variants"
  readonly variants: readonly AuditLogVariantChange[]
}

type AuditLogChange = AuditLogFieldChange | AuditLogVariantsChange

interface AuditLogChangesDetail {
  readonly changes: readonly AuditLogChange[]
  readonly kind: "changes"
}

type AuditLogDetail = AuditLogChangesDetail | AuditLogEmailDetail | AuditLogMessageDetail | AuditLogTextDetail | AuditLogValuesDetail

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
  change: AuditLogChange
  detail: AuditLogDetail
  detailValue: AuditLogValue
  emailDetail: AuditLogEmailDetail
  insert: typeof auditLog.$inferInsert
  select: typeof auditLog.$inferSelect
  stats: AuditLogStats
  valueMove: AuditLogValueMove
  variantChange: AuditLogVariantChange
}
