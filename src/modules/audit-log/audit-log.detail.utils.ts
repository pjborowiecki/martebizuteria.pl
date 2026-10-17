import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { parseMoneyInputToMinorUnits } from "~/src/modules/_core/utils/currency"
import { describeAuditLogChanges } from "~/src/modules/audit-log/audit-log.changes.utils"
import { AUDIT_EMAIL_KIND, AUDIT_LOG_ACTION, type AuditEmailKind } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"
import { auditLogZodSchemas } from "~/src/modules/audit-log/audit-log.zod"

export interface AuditLogDetailSource {
  readonly action: string
  readonly detail: string | null
  readonly metadata: Record<string, unknown> | undefined
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

const AUDIT_LOG_DETAIL_DESCRIBERS: Readonly<Partial<Record<string, AuditLogDetailDescriber>>> = {
  [AUDIT_LOG_ACTION.AUTH_ROLE_CHANGED]: describeRole,
  [AUDIT_LOG_ACTION.CUSTOMER_CART_ABANDONED]: describeCartItemCount,
  [AUDIT_LOG_ACTION.CUSTOMER_DELETION_FAILED]: describeStripeCustomerKept,
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
