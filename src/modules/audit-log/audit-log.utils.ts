import { type z } from "zod/v4"

import { ROLES } from "~/src/integrations/better-auth/auth.access"
import { type DisplayPreferences } from "~/src/integrations/use-intl/i18n.display"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { DATE_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"
import { parseMoneyInputToMinorUnits } from "~/src/modules/_core/utils/currency"
import { formatCalendarDateToIsoDate, normalizeCalendarDate, startOfCalendarDate, toCalendarDate } from "~/src/modules/_core/utils/datetime"
import { type DateTimeColumnFilterValue } from "~/src/modules/_core/utils/datetime-column-filter"
import {
  AUDIT_EMAIL_KIND,
  AUDIT_LOG_ACTION,
  AUDIT_LOG_CATEGORIES,
  AUDIT_LOG_CATEGORY_FILTER,
  type AuditEmailKind,
  type AuditLogActorRole,
  type AuditLogCategory,
  type AuditLogCategoryFilter,
  CUSTOMER_EMAIL_CHANGE_REFUSAL,
} from "~/src/modules/audit-log/audit-log.constants"
import {
  type AuditChangeMetadata,
  type AuditEventOptions,
  type AuditLog,
  type AuditLogActorInput,
  type AuditLogDetailSource,
} from "~/src/modules/audit-log/audit-log.types"
import { auditLogZodSchemas } from "~/src/modules/audit-log/audit-log.zod"
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

export const withResourceId = (
  target: string,
  options?: AuditEventOptions,
): { target: string; detail?: string | undefined; metadata?: Record<string, unknown> | undefined; resourceId?: string | undefined } => ({
  detail: options?.detail,
  metadata: options?.metadata,
  resourceId: options?.resourceId ?? target,
  target,
})

export const resolveActorAuditTarget = (
  actor: AuditLogActorInput,
  options?: AuditEventOptions,
): { detail?: string | undefined; metadata?: Record<string, unknown> | undefined; resourceId?: string | undefined; target: string } => {
  const resourceId = options?.resourceId ?? actor.id
  const email = actor.email?.trim()

  if (email !== undefined && email !== "") {
    return {
      detail: options?.detail ?? actor.name,
      metadata: { ...options?.metadata, email },
      resourceId,
      target: email,
    }
  }

  return {
    detail: options?.detail,
    metadata: options?.metadata,
    resourceId,
    target: actor.name,
  }
}

export const resolveAuthAuditActor = (
  user: Readonly<{ email: string; id: string; name: string; role?: string | null | undefined }>,
): AuditLogActorInput => {
  let actorRole: AuditLogActorInput["role"] = "unknown"

  if (user.role === ROLES.ADMIN) {
    actorRole = "admin"
  } else if (user.role === ROLES.CUSTOMER) {
    actorRole = "customer"
  }

  return {
    email: user.email,
    id: user.id,
    name: user.name,
    role: actorRole,
  }
}

export const buildAuditChangeMetadata = <TBefore extends object, TAfter extends object>(
  before: TBefore,
  after: TAfter,
  fields: readonly (keyof TBefore & keyof TAfter)[],
): AuditChangeMetadata<TBefore, TAfter> | undefined => {
  const changed: string[] = []
  const oldValues: Partial<TBefore> = {}
  const newValues: Partial<TAfter> = {}

  for (const field of fields) {
    const previous = before[field]
    const next = after[field]

    if (!Object.is(previous, next)) {
      changed.push(String(field))
      oldValues[field] = previous
      newValues[field] = next
    }
  }

  if (changed.length === 0) {
    return undefined
  }

  return {
    changed,
    new: newValues,
    old: oldValues,
  }
}

export const toAuditMetadataRecord = (metadata: AuditChangeMetadata<object, object>): Record<string, unknown> => ({
  changed: metadata.changed,
  new: metadata.new,
  old: metadata.old,
})

type VariantSnapshot = z.infer<(typeof auditLogZodSchemas)["variantSnapshots"]>[number]

const VARIANT_KEY_SEPARATOR = "\u0000"

const formatReadableValue = (value: unknown, nested: boolean): string => {
  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return String(value)
  }

  if (typeof value !== "object" || value === null) {
    return EMPTY_VALUE
  }

  const parts = Array.isArray(value)
    ? value.map((item: unknown) => formatReadableValue(item, true))
    : Object.entries(value).map(([key, item]) => `${key}: ${formatReadableValue(item, true)}`)
  const text = parts.join(", ")

  return nested ? `(${text})` : text
}

const toChangeValue = (value: unknown): AuditLog["detailValue"]["value"] | undefined => {
  if (value === null || value === undefined) {
    return undefined
  }

  return typeof value === "number" || typeof value === "string" ? value : formatReadableValue(value, false)
}

const keyVariantsBySku = (variants: readonly VariantSnapshot[]): ReadonlyMap<string, VariantSnapshot> => {
  const occurrences = new Map<string, number>()

  return new Map(
    variants.map((variant) => {
      const occurrence = occurrences.get(variant.sku) ?? 0
      occurrences.set(variant.sku, occurrence + 1)

      return [`${variant.sku}${VARIANT_KEY_SEPARATOR}${String(occurrence)}`, variant] as const
    }),
  )
}

const describeMove = (from: number, to: number): AuditLog["valueMove"] | undefined => (from === to ? undefined : { from, to })

const describeVariantChanges = (before: readonly VariantSnapshot[], after: readonly VariantSnapshot[]): AuditLog["variantChange"][] => {
  const previous = keyVariantsBySku(before)
  const next = keyVariantsBySku(after)
  const keptOrAdded = [...next].flatMap(([key, variant]): AuditLog["variantChange"][] => {
    const prior = previous.get(key)
    if (prior === undefined) {
      return [{ change: "added", sku: variant.sku }]
    }

    const price = describeMove(prior.price, variant.price)
    const quantity = describeMove(prior.quantity, variant.quantity)

    return price === undefined && quantity === undefined ? [] : [{ change: "updated", price, quantity, sku: variant.sku }]
  })
  const removed = [...previous]
    .filter(([key]) => !next.has(key))
    .map(([, variant]): AuditLog["variantChange"] => ({ change: "removed", sku: variant.sku }))

  return [...keptOrAdded, ...removed]
}

const describeVariantsChange = (from: unknown, to: unknown): AuditLog["change"][] | undefined => {
  const before = auditLogZodSchemas.variantSnapshots.safeParse(from).data
  const after = auditLogZodSchemas.variantSnapshots.safeParse(to).data
  if (before === undefined || after === undefined) {
    return undefined
  }

  const variants = describeVariantChanges(before, after)

  return variants.length === 0 ? [] : [{ field: "variants", variants }]
}

const describeChange = (field: string, from: unknown, to: unknown): AuditLog["change"][] =>
  (field === "variants" ? describeVariantsChange(from, to) : undefined) ?? [{ field, from: toChangeValue(from), to: toChangeValue(to) }]

export const describeAuditLogChanges = (metadata: Record<string, unknown> | undefined): AuditLog["change"][] | undefined => {
  const changes = auditLogZodSchemas.changeMetadata.safeParse(metadata).data

  return changes?.changed.flatMap((field) => describeChange(field, changes.old[field], changes.new[field]))
}

type AuditLogDetailDescriber = (source: AuditLogDetailSource) => AuditLog["detail"] | undefined

const DETAIL_PART_SEPARATOR = " — "

const EMAIL_RECIPIENT_SEPARATOR = " → "

const IDEMPOTENCY_KEY_SEPARATOR = "/"

const LEGACY_EMAIL_KIND_BY_LABEL: ReadonlyMap<string, AuditEmailKind> = new Map([
  ["Auth account-deleted email", AUDIT_EMAIL_KIND.ACCOUNT_DELETED],
  ["Auth change-email confirmation email", AUDIT_EMAIL_KIND.CHANGE_EMAIL],
  ["Auth password-changed email", AUDIT_EMAIL_KIND.PASSWORD_CHANGED],
  ["Auth reset-password email", AUDIT_EMAIL_KIND.RESET_PASSWORD],
  ["Auth verification email", AUDIT_EMAIL_KIND.VERIFICATION],
  ["New order notification", AUDIT_EMAIL_KIND.NEW_ORDER],
  ["Newsletter already-subscribed notice", AUDIT_EMAIL_KIND.NEWSLETTER_ALREADY_SUBSCRIBED],
  ["Newsletter campaign", AUDIT_EMAIL_KIND.NEWSLETTER_CAMPAIGN],
  ["Newsletter confirmation", AUDIT_EMAIL_KIND.NEWSLETTER_CONFIRMATION],
  ["Newsletter test", AUDIT_EMAIL_KIND.NEWSLETTER_TEST],
  ["Order cancelled", AUDIT_EMAIL_KIND.ORDER_CANCELLED],
  ["Order confirmation", AUDIT_EMAIL_KIND.ORDER_CONFIRMATION],
  ["Order refunded", AUDIT_EMAIL_KIND.ORDER_REFUNDED],
  ["Order shipped", AUDIT_EMAIL_KIND.ORDER_SHIPPED],
  ["Payment failed", AUDIT_EMAIL_KIND.PAYMENT_FAILED],
  ["Public newsletter email", AUDIT_EMAIL_KIND.NEWSLETTER_SUBSCRIPTION],
  ["Public password-reset email", AUDIT_EMAIL_KIND.RESET_PASSWORD],
  ["Public verification email", AUDIT_EMAIL_KIND.VERIFICATION],
  ["Public withdrawal email", AUDIT_EMAIL_KIND.ORDER_WITHDRAWAL],
  ["Withdrawal acknowledgement", AUDIT_EMAIL_KIND.ORDER_WITHDRAWAL],
  ["Withdrawal notice", AUDIT_EMAIL_KIND.ORDER_WITHDRAWAL_NOTICE],
])

const LEGACY_DAILY_LIMIT_PATTERN = /^the shop reached its daily limit of (?<limit>\d+) emails/u

const LEGACY_STRIPE_CUSTOMER_KEPT_PREFIX = "Stripe customer not deleted, account kept — "

const MINOR_UNITS_PATTERN = /^\d+$/u

const PAID_AMOUNT_SUFFIX = ` ${STORE_CURRENCY_CODE}`

const describeText = ({ detail }: AuditLogDetailSource): AuditLog["detail"] | undefined =>
  detail === null || detail.trim() === "" ? undefined : { kind: "text", text: detail }

const describeValues = (source: AuditLogDetailSource, values: readonly AuditLog["detailValue"][]): AuditLog["detail"] | undefined =>
  values.length === 0 ? describeText(source) : { kind: "values", values }

const splitLegacyEmailDetail = (detail: string): Omit<AuditLog["emailDetail"], "emailKind" | "kind"> & { readonly label: string } => {
  const [summary = detail, ...failureParts] = detail.split(DETAIL_PART_SEPARATOR)
  const [label = summary, recipient] = summary.split(EMAIL_RECIPIENT_SEPARATOR)
  const failure = failureParts.join(DETAIL_PART_SEPARATOR)
  const dailyLimit = LEGACY_DAILY_LIMIT_PATTERN.exec(failure)?.groups?.["limit"]

  return {
    dailyLimit: dailyLimit === undefined ? undefined : Number(dailyLimit),
    failure: failure === "" || dailyLimit !== undefined ? undefined : failure,
    label,
    recipient,
  }
}

const describeEmail = (source: AuditLogDetailSource): AuditLog["detail"] | undefined => {
  const metadata = auditLogZodSchemas.emailMetadata.safeParse(source.metadata).data
  if (metadata?.emailKind !== undefined) {
    return { dailyLimit: metadata.dailyLimit, emailKind: metadata.emailKind, failure: source.detail ?? undefined, kind: "email" }
  }

  if (source.detail === null) {
    return undefined
  }

  const { label, ...parts } = splitLegacyEmailDetail(source.detail)
  const emailKind =
    auditLogZodSchemas.emailKind.safeParse(metadata?.idempotencyKey?.split(IDEMPOTENCY_KEY_SEPARATOR)[0]).data ??
    LEGACY_EMAIL_KIND_BY_LABEL.get(label)

  return emailKind === undefined ? describeText(source) : { emailKind, kind: "email", ...parts }
}

const describeCartItemCount = (source: AuditLogDetailSource): AuditLog["detail"] | undefined => {
  const metadata = auditLogZodSchemas.cartAbandonedMetadata.safeParse(source.metadata).data

  return metadata === undefined
    ? describeText(source)
    : { kind: "message", message: "cartItemCount", values: { count: metadata.itemCount } }
}

const describeRecipientCount = (source: AuditLogDetailSource): AuditLog["detail"] | undefined => {
  const metadata = auditLogZodSchemas.newsletterSentMetadata.safeParse(source.metadata).data

  return metadata === undefined
    ? describeText(source)
    : { kind: "message", message: "recipientCount", values: { count: metadata.recipientCount } }
}

const describeClaimedOrderCount = (source: AuditLogDetailSource): AuditLog["detail"] | undefined => {
  const metadata = auditLogZodSchemas.ordersClaimedMetadata.safeParse(source.metadata).data

  return metadata === undefined
    ? describeText(source)
    : { kind: "message", message: "claimedOrderCount", values: { count: metadata.orderCount } }
}

const EMAIL_CHANGE_REFUSAL_MESSAGES = {
  [CUSTOMER_EMAIL_CHANGE_REFUSAL.MISMATCH]: "emailChangeMismatch",
  [CUSTOMER_EMAIL_CHANGE_REFUSAL.TOO_MANY_ATTEMPTS]: "emailChangeTooManyAttempts",
} as const

const describeEmailChangeRequest = (source: AuditLogDetailSource): AuditLog["detail"] | undefined => {
  const metadata = auditLogZodSchemas.customerEmailChangeMetadata.safeParse(source.metadata).data
  if (metadata === undefined) {
    return describeText(source)
  }

  const { newEmail, orderNumber, refusal } = metadata

  return {
    kind: "message",
    message: refusal === undefined ? "emailChangeRequested" : EMAIL_CHANGE_REFUSAL_MESSAGES[refusal],
    values: { newEmail, orderNumber },
  }
}

const describeStripeCustomerKept = ({ detail }: AuditLogDetailSource): AuditLog["detail"] | undefined => {
  if (detail === null) {
    return undefined
  }

  const error = detail.startsWith(LEGACY_STRIPE_CUSTOMER_KEPT_PREFIX) ? detail.slice(LEGACY_STRIPE_CUSTOMER_KEPT_PREFIX.length) : detail

  return { kind: "message", message: "stripeCustomerKept", values: { error } }
}

const describeRedeemedAmount = (source: AuditLogDetailSource): AuditLog["detail"] | undefined =>
  source.detail !== null && MINOR_UNITS_PATTERN.test(source.detail)
    ? { kind: "values", values: [{ field: "amount", value: Number(source.detail) }] }
    : describeText(source)

const describePaidAmount = (source: AuditLogDetailSource): AuditLog["detail"] | undefined => {
  const amount = source.detail?.endsWith(PAID_AMOUNT_SUFFIX) === true ? source.detail.slice(0, -PAID_AMOUNT_SUFFIX.length) : undefined
  const minorUnits = amount === undefined || amount === "" ? undefined : parseMoneyInputToMinorUnits(amount, STORE_CURRENCY_CODE)

  return minorUnits === undefined ? describeText(source) : { kind: "values", values: [{ field: "amount", value: minorUnits }] }
}

const describeRole = (source: AuditLogDetailSource): AuditLog["detail"] | undefined =>
  describeValues(source, source.detail === null ? [] : [{ field: "role", value: source.detail }])

const describeDisputeOpened = (source: AuditLogDetailSource): AuditLog["detail"] | undefined => {
  const [reason, status, ...rest] = source.detail?.split(DETAIL_PART_SEPARATOR) ?? []

  return describeValues(
    source,
    reason === undefined || status === undefined || rest.length > 0
      ? []
      : [
          { field: "disputeReason", value: reason },
          { field: "disputeStatus", value: status },
        ],
  )
}

const describeDisputeClosed = (source: AuditLogDetailSource): AuditLog["detail"] | undefined =>
  describeValues(source, source.detail === null ? [] : [{ field: "disputeStatus", value: source.detail }])

const describeRefundFailed = (source: AuditLogDetailSource): AuditLog["detail"] | undefined => {
  const [amount, status, ...reasons] = source.detail?.split(DETAIL_PART_SEPARATOR) ?? []

  return describeValues(
    source,
    amount === undefined || status === undefined || !MINOR_UNITS_PATTERN.test(amount) || reasons.length > 1
      ? []
      : [
          { field: "amount", value: Number(amount) },
          { field: "refundStatus", value: status },
          ...reasons.map((reason) => ({ field: "refundFailureReason", value: reason })),
        ],
  )
}

const describeChanges = (source: AuditLogDetailSource): AuditLog["detail"] | undefined => {
  const changes = describeAuditLogChanges(source.metadata)
  if (changes === undefined) {
    return describeText(source)
  }

  return changes.length === 0 ? undefined : { changes, kind: "changes" }
}

const describeAddressChange = (source: AuditLogDetailSource): AuditLog["detail"] | undefined => {
  const changes = describeAuditLogChanges(source.metadata)
  if (changes !== undefined) {
    return { changes, kind: "changes" }
  }

  const [from, to, ...rest] = source.detail?.split(EMAIL_RECIPIENT_SEPARATOR) ?? []

  return from === undefined || to === undefined || rest.length > 0
    ? describeText(source)
    : { changes: [{ field: "email", from, to }], kind: "changes" }
}

const AUDIT_LOG_DETAIL_DESCRIBERS: Readonly<Partial<Record<string, AuditLogDetailDescriber>>> = {
  [AUDIT_LOG_ACTION.AUTH_EMAIL_CHANGED]: describeAddressChange,
  [AUDIT_LOG_ACTION.AUTH_ROLE_CHANGED]: describeRole,
  [AUDIT_LOG_ACTION.CUSTOMER_CART_ABANDONED]: describeCartItemCount,
  [AUDIT_LOG_ACTION.CUSTOMER_DELETION_FAILED]: describeStripeCustomerKept,
  [AUDIT_LOG_ACTION.CUSTOMER_EMAIL_CHANGE_REQUESTED]: describeEmailChangeRequest,
  [AUDIT_LOG_ACTION.CUSTOMER_EMAIL_CHANGE_VERIFICATION_FAILED]: describeEmailChangeRequest,
  [AUDIT_LOG_ACTION.CUSTOMER_ORDERS_CLAIMED]: describeClaimedOrderCount,
  [AUDIT_LOG_ACTION.DELIVERY_METHOD_UPDATED]: describeChanges,
  [AUDIT_LOG_ACTION.DISCOUNT_REDEEMED]: describeRedeemedAmount,
  [AUDIT_LOG_ACTION.EMAIL_DEFERRED]: describeEmail,
  [AUDIT_LOG_ACTION.EMAIL_FAILED]: describeEmail,
  [AUDIT_LOG_ACTION.EMAIL_RESEND_REQUESTED]: describeEmail,
  [AUDIT_LOG_ACTION.EMAIL_SENT]: describeEmail,
  [AUDIT_LOG_ACTION.NEWSLETTER_SENT]: describeRecipientCount,
  [AUDIT_LOG_ACTION.ORDER_DISPUTE_CLOSED]: describeDisputeClosed,
  [AUDIT_LOG_ACTION.ORDER_DISPUTE_OPENED]: describeDisputeOpened,
  [AUDIT_LOG_ACTION.ORDER_PAYMENT_CAPTURED]: describePaidAmount,
  [AUDIT_LOG_ACTION.ORDER_REFUND_FAILED]: describeRefundFailed,
  [AUDIT_LOG_ACTION.ORDER_REFUND_INITIATED]: describeChanges,
  [AUDIT_LOG_ACTION.ORDER_STEPPED_BACK]: describeChanges,
  [AUDIT_LOG_ACTION.PRODUCT_UPDATED]: describeChanges,
  [AUDIT_LOG_ACTION.SETTINGS_UPDATED]: describeChanges,
}

export const describeAuditLogDetail = (source: AuditLogDetailSource): AuditLog["detail"] | undefined =>
  (AUDIT_LOG_DETAIL_DESCRIBERS[source.action] ?? describeText)(source)
