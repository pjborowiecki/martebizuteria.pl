import { type useTranslations } from "use-intl/react"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { formatPrice } from "~/src/modules/_core/utils/currency"
import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"

const DETAIL_PART_SEPARATOR = " — "

const EMAIL_RECIPIENT_SEPARATOR = " → "

interface AuditDetailFormatContext {
  readonly locale: string
  readonly t: ReturnType<typeof useTranslations<"pages.admin">>
}

const formatEmail = ({ dailyLimit, emailKind, failure, recipient }: AuditLog["emailDetail"], { t }: AuditDetailFormatContext): string => {
  const emailName = t(`audit.details.emails.${emailKind}`)
  const summary = recipient === undefined ? emailName : `${emailName}${EMAIL_RECIPIENT_SEPARATOR}${recipient}`
  const reason = dailyLimit === undefined ? failure : t("audit.details.emailDailyLimit", { limit: dailyLimit })

  return reason === undefined ? summary : `${summary}${DETAIL_PART_SEPARATOR}${reason}`
}

const formatValue = (entry: AuditLog["detailValue"], { locale, t }: AuditDetailFormatContext): string => {
  if (entry.field === "amount") {
    return formatPrice(entry.value, STORE_CURRENCY_CODE, locale)
  }

  const messageKey = `audit.details.values.${entry.field}.${entry.value}`

  return t.has(messageKey) ? t(messageKey) : entry.value
}

export const formatAuditLogDetail = (detail: AuditLog["detail"], context: AuditDetailFormatContext): string => {
  if (detail.kind === "email") {
    return formatEmail(detail, context)
  }

  if (detail.kind === "message") {
    return context.t(`audit.details.messages.${detail.message}`, detail.values)
  }

  if (detail.kind === "values") {
    return detail.values.map((entry) => formatValue(entry, context)).join(DETAIL_PART_SEPARATOR)
  }

  return detail.text
}
