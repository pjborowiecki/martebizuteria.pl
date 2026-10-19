import {
  type AuditEmailKind,
  type AuditLogAction,
  type AuditLogActorRole,
  type AuditLogCategory,
  type AuditLogSeverity,
  type CustomerAccountLoginStatus,
} from "~/src/modules/audit-log/audit-log.constants"
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
  readonly message:
    | "cartItemCount"
    | "claimedOrderCount"
    | "emailChangeMismatch"
    | "emailChangeRequested"
    | "emailChangeTooManyAttempts"
    | "recipientCount"
    | "stripeCustomerKept"
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

interface CustomerAccountActivityItem {
  readonly actionKey: "cartItemAdded" | "loginFailed" | "loginSuccess" | "logout" | "orderDelivered" | "orderPlaced" | "orderShipped"
  readonly createdAt: Date
  readonly params: Record<string, string>
}

interface CustomerAccountLoginHistoryItem {
  readonly createdAt: Date
  readonly id: string
  readonly ipAddress?: string | undefined
  readonly status: CustomerAccountLoginStatus
}

export interface AuditLog {
  actor: AuditLogActor
  adminListItem: AdminAuditListItem
  change: AuditLogChange
  customerActivityItem: CustomerAccountActivityItem
  customerLoginHistoryItem: CustomerAccountLoginHistoryItem
  detail: AuditLogDetail
  detailValue: AuditLogValue
  emailDetail: AuditLogEmailDetail
  insert: typeof auditLog.$inferInsert
  select: typeof auditLog.$inferSelect
  stats: AuditLogStats
  valueMove: AuditLogValueMove
  variantChange: AuditLogVariantChange
}

export interface AuditLogActorInput {
  readonly email?: string | undefined
  readonly id?: string | undefined
  readonly name: string
  readonly role: AuditLogActorRole
}

export interface AuditLogEventInput {
  readonly action: AuditLogAction
  readonly actor: AuditLogActorInput
  readonly category: AuditLogCategory
  readonly detail?: string | undefined
  readonly id?: string | undefined
  readonly ip?: string | undefined
  readonly metadata?: Record<string, unknown> | undefined
  readonly resourceId?: string | undefined
  readonly severity: AuditLogSeverity
  readonly target: string
}

export interface AuditEventOptions {
  readonly actor?: AuditLogActorInput | undefined
  readonly detail?: string | undefined
  readonly ip?: string | undefined
  readonly metadata?: Record<string, unknown> | undefined
  readonly resourceId?: string | undefined
}

export interface AccountAuditEvent {
  readonly action: AuditLogAction
  readonly category: AuditLogCategory
  readonly severity: AuditLogSeverity
}

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

export interface AuditFieldChange<TValue> {
  readonly from: TValue
  readonly to: TValue
}

export interface AuditChangeMetadata<TBefore, TAfter> {
  readonly changed: readonly string[]
  readonly new: Partial<TAfter>
  readonly old: Partial<TBefore>
}

export interface AuditLogDetailSource {
  readonly action: string
  readonly detail: string | null
  readonly metadata: Record<string, unknown> | undefined
}
