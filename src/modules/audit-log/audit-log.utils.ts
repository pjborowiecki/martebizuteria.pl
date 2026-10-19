import { type DisplayPreferences } from "~/src/integrations/use-intl/i18n.display"

import { DATE_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"
import { formatCalendarDateToIsoDate, normalizeCalendarDate, startOfCalendarDate, toCalendarDate } from "~/src/modules/_core/utils/datetime"
import { type DateTimeColumnFilterValue } from "~/src/modules/_core/utils/datetime-column-filter"
import {
  AUDIT_LOG_ACTION,
  AUDIT_LOG_CATEGORIES,
  AUDIT_LOG_CATEGORY_FILTER,
  type AuditLogActorRole,
  type AuditLogCategory,
  type AuditLogCategoryFilter,
} from "~/src/modules/audit-log/audit-log.constants"
import { describeAuditLogDetail } from "~/src/modules/audit-log/audit-log.detail.utils"
import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"
import { resolveAdminCustomerInitials } from "~/src/modules/user/user.utils"

export const isAuditLogCategoryFilter = (value: string): value is AuditLogCategoryFilter =>
  value === AUDIT_LOG_CATEGORY_FILTER.ALL || (AUDIT_LOG_CATEGORIES as readonly string[]).includes(value)

export const resolveAuditLogCategoryFilter = (value: AuditLogCategoryFilter | undefined): AuditLogCategory | undefined => {
  if (value === undefined || value === AUDIT_LOG_CATEGORY_FILTER.ALL) {
    return undefined
  }

  return value
}

export const resolveAuditLogToday = (timeZone: string, now: Date = new Date()): string =>
  formatCalendarDateToIsoDate(toCalendarDate(now, timeZone))

export const resolveNextAuditLogDayStart = (now: Date, timeZone: string): Date => {
  const today = toCalendarDate(now, timeZone)

  return startOfCalendarDate(normalizeCalendarDate({ ...today, day: today.day + 1 }), timeZone)
}

export const buildAuditLogDayFilter = (isoDate: string): DateTimeColumnFilterValue => ({
  date: isoDate,
  operator: DATE_COLUMN_FILTER_OPERATOR.ON,
})

export const toAuditActionMessageKey = (action: string): string => `audit.actions.${action.replaceAll(".", "_")}`

export const formatAdminAuditTimestamp = (createdAt: Date | string, { formatLocale, timeZone }: DisplayPreferences): string => {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt)

  return date.toLocaleString(formatLocale, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    second: "2-digit",
    timeZone,
    year: "numeric",
  })
}

interface AuditLogListSourceRow {
  readonly action: string
  readonly actorId: string | null
  readonly actorName: string
  readonly actorRole: AuditLogActorRole
  readonly category: AuditLog["select"]["category"]
  readonly createdAt: Date
  readonly detail: string | null
  readonly id: string
  readonly ip: string | null
  readonly metadata: string | null
  readonly resourceId: string | null
  readonly severity: AuditLog["select"]["severity"]
  readonly target: string
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu

export interface AdminAuditTargetPresentation {
  readonly label: string
  readonly resourceId?: string
}

const isAuditMetadataRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const parseAuditMetadata = (metadata: string | null): Record<string, unknown> | undefined => {
  if (metadata === null || metadata === "") {
    return undefined
  }

  try {
    const parsed: unknown = JSON.parse(metadata)
    if (isAuditMetadataRecord(parsed)) {
      return parsed
    }
  } catch {
    return undefined
  }

  return undefined
}

export const resolveAdminAuditTargetPresentation = ({
  metadata,
  resourceId,
  target,
}: {
  readonly metadata?: Record<string, unknown> | undefined
  readonly resourceId?: string | undefined
  readonly target: string
}): AdminAuditTargetPresentation => {
  const handleFromMetadata = typeof metadata?.["handle"] === "string" ? metadata["handle"] : undefined
  const emailFromMetadata = typeof metadata?.["email"] === "string" ? metadata["email"] : undefined

  let labelFromMetadata: string | undefined = undefined
  if (emailFromMetadata !== undefined && emailFromMetadata !== "" && !target.includes("@")) {
    labelFromMetadata = emailFromMetadata
  } else if (handleFromMetadata !== undefined && handleFromMetadata !== "" && UUID_PATTERN.test(target)) {
    labelFromMetadata = handleFromMetadata
  }

  if (resourceId !== undefined && resourceId !== target) {
    return { label: labelFromMetadata ?? target, resourceId }
  }

  if (labelFromMetadata !== undefined) {
    return { label: labelFromMetadata, resourceId: target }
  }

  return { label: target }
}

export const formatAdminAuditTarget = (target: string, resourceId?: string): string => {
  const { label, resourceId: resolvedResourceId } = resolveAdminAuditTargetPresentation({ resourceId, target })
  if (resolvedResourceId === undefined || resolvedResourceId === label) {
    return label
  }

  return `${label} (${resolvedResourceId})`
}

const CHECKOUT_SESSION_ID_PREFIX = "cs_"

export const resolveAuditLogAction = (action: string, resourceId: string | null): string =>
  action === AUDIT_LOG_ACTION.ORDER_RELEASED && resourceId !== null && !resourceId.startsWith(CHECKOUT_SESSION_ID_PREFIX)
    ? AUDIT_LOG_ACTION.ORDER_DELIVERED
    : action

export const toAdminAuditListItem = (row: AuditLogListSourceRow, preferences: DisplayPreferences): AuditLog["adminListItem"] => {
  const metadata = parseAuditMetadata(row.metadata)
  const presentation = resolveAdminAuditTargetPresentation({
    metadata,
    resourceId: row.resourceId ?? undefined,
    target: row.target,
  })

  return {
    action: resolveAuditLogAction(row.action, row.resourceId),
    actor: {
      id: row.actorId ?? undefined,
      initials: resolveAdminCustomerInitials(row.actorName),
      name: row.actorName,
      role: row.actorRole,
    },
    category: row.category,
    detail: describeAuditLogDetail({ action: row.action, detail: row.detail, metadata }),
    id: row.id,
    ip: row.ip ?? undefined,
    resourceId: presentation.resourceId,
    severity: row.severity,
    target: presentation.label,
    timestamp: formatAdminAuditTimestamp(row.createdAt, preferences),
  }
}

export const serializeAuditMetadata = (metadata: Record<string, unknown> | undefined): string | undefined => {
  if (metadata === undefined || Object.keys(metadata).length === 0) {
    return undefined
  }

  return JSON.stringify(metadata)
}

export const mapAuditLogToActivityItem = (
  row: {
    readonly action: string
    readonly createdAt: Date
    readonly detail: string | null
    readonly metadata: string | null
    readonly resourceId?: string | null | undefined
  },
  orderNumberByOrderId: ReadonlyMap<string, string> = new Map(),
): AuditLog["customerActivityItem"] | undefined => {
  const metadata = parseActivityMetadata(row.metadata)
  const metadataOrderId = typeof metadata["orderId"] === "string" ? metadata["orderId"].trim() : ""
  const referencedOrderId = metadataOrderId === "" ? (row.resourceId ?? "") : metadataOrderId
  const orderId = referencedOrderId === "" ? undefined : orderNumberByOrderId.get(referencedOrderId)
  switch (row.action) {
    case AUDIT_LOG_ACTION.AUTH_LOGIN: {
      return {
        actionKey: "loginSuccess",
        createdAt: row.createdAt,
        params: {},
      }
    }
    case AUDIT_LOG_ACTION.AUTH_LOGOUT: {
      return {
        actionKey: "logout",
        createdAt: row.createdAt,
        params: {},
      }
    }
    case AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED: {
      return {
        actionKey: "loginFailed",
        createdAt: row.createdAt,
        params: {},
      }
    }
    case AUDIT_LOG_ACTION.CUSTOMER_CART_ITEM_ADDED: {
      const item = typeof metadata["productTitle"] === "string" ? metadata["productTitle"] : (row.detail ?? "")

      return item === ""
        ? undefined
        : {
            actionKey: "cartItemAdded",
            createdAt: row.createdAt,
            params: {
              item,
            },
          }
    }
    case AUDIT_LOG_ACTION.ORDER_PLACED: {
      return orderId === undefined
        ? undefined
        : {
            actionKey: "orderPlaced",
            createdAt: row.createdAt,
            params: {
              id: orderId,
            },
          }
    }
    case AUDIT_LOG_ACTION.ORDER_SHIPPED: {
      return orderId === undefined
        ? undefined
        : {
            actionKey: "orderShipped",
            createdAt: row.createdAt,
            params: {
              id: orderId,
            },
          }
    }
    case AUDIT_LOG_ACTION.ORDER_DELIVERED:
    case AUDIT_LOG_ACTION.ORDER_RELEASED: {
      return orderId === undefined
        ? undefined
        : {
            actionKey: "orderDelivered",
            createdAt: row.createdAt,
            params: {
              id: orderId,
            },
          }
    }
    default: {
      return undefined
    }
  }
}

const isActivityMetadataRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const parseActivityMetadata = (raw: string | null): Record<string, unknown> => {
  if (raw === null || raw === "") {
    return {}
  }

  try {
    const parsed: unknown = JSON.parse(raw)

    return isActivityMetadataRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}
