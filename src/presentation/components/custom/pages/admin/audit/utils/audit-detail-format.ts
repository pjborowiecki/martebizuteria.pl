import { type useTranslations } from "use-intl/react"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { formatPrice } from "~/src/modules/_core/utils/currency"
import { AUDIT_LOG_MONEY_FIELDS } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"

const DETAIL_PART_SEPARATOR = " — "

const CHANGE_SEPARATOR = "; "

const LIST_SEPARATOR = ", "

const MOVE_ARROW = " → "

interface AuditDetailFormatContext {
  readonly locale: string
  readonly t: ReturnType<typeof useTranslations<"pages.admin">>
}

const translateOrKeep = ({ t }: AuditDetailFormatContext, messageKey: string, fallback: string): string =>
  t.has(messageKey) ? t(messageKey) : fallback

const formatEmail = ({ dailyLimit, emailKind, failure, recipient }: AuditLog["emailDetail"], { t }: AuditDetailFormatContext): string => {
  const emailName = t(`audit.details.emails.${emailKind}`)
  const summary = recipient === undefined ? emailName : `${emailName}${MOVE_ARROW}${recipient}`
  const reason = dailyLimit === undefined ? failure : t("audit.details.emailDailyLimit", { limit: dailyLimit })

  return reason === undefined ? summary : `${summary}${DETAIL_PART_SEPARATOR}${reason}`
}

const formatValue = (field: string, value: AuditLog["detailValue"]["value"] | undefined, context: AuditDetailFormatContext): string => {
  if (value === undefined) {
    return EMPTY_VALUE
  }

  if (typeof value === "string") {
    return translateOrKeep(context, `audit.details.values.${field}.${value}`, value)
  }

  return AUDIT_LOG_MONEY_FIELDS.has(field)
    ? formatPrice(value, STORE_CURRENCY_CODE, context.locale)
    : new Intl.NumberFormat(context.locale).format(value)
}

const formatVariantChange = (variant: AuditLog["variantChange"], context: AuditDetailFormatContext): string => {
  const { locale, t } = context
  const sku = variant.sku === "" ? t("audit.details.variants.noSku") : variant.sku
  if (variant.change !== "updated") {
    return t(`audit.details.variants.${variant.change}`, { sku })
  }

  const moves = [
    variant.price === undefined
      ? undefined
      : t("audit.details.variants.price", {
          from: formatPrice(variant.price.from, STORE_CURRENCY_CODE, locale),
          to: formatPrice(variant.price.to, STORE_CURRENCY_CODE, locale),
        }),
    variant.quantity === undefined
      ? undefined
      : t("audit.details.variants.quantity", { from: variant.quantity.from, to: variant.quantity.to }),
  ].filter((move) => move !== undefined)

  return `${sku} (${moves.join(LIST_SEPARATOR)})`
}

const formatChange = (change: AuditLog["change"], context: AuditDetailFormatContext): string => {
  const label = translateOrKeep(context, `audit.details.fields.${change.field}`, change.field)
  const description =
    "variants" in change
      ? change.variants.map((variant) => formatVariantChange(variant, context)).join(LIST_SEPARATOR)
      : `${formatValue(change.field, change.from, context)}${MOVE_ARROW}${formatValue(change.field, change.to, context)}`

  return `${label}: ${description}`
}

export const formatAuditLogDetail = (detail: AuditLog["detail"], context: AuditDetailFormatContext): string => {
  if (detail.kind === "changes") {
    return detail.changes.map((change) => formatChange(change, context)).join(CHANGE_SEPARATOR)
  }

  if (detail.kind === "email") {
    return formatEmail(detail, context)
  }

  if (detail.kind === "message") {
    return context.t(`audit.details.messages.${detail.message}`, detail.values)
  }

  if (detail.kind === "values") {
    return detail.values.map(({ field, value }) => formatValue(field, value, context)).join(DETAIL_PART_SEPARATOR)
  }

  return detail.text
}
