import { type JSX, useCallback, useMemo } from "react"

import { ListFilter } from "lucide-react"
import { useTranslations } from "use-intl/react"

import {
  AUDIT_LOG_CATEGORIES,
  AUDIT_LOG_CATEGORY_FILTER,
  AUDIT_LOG_SEVERITIES,
  type AuditLogCategoryFilter,
  type AuditLogSeverity,
} from "~/src/modules/audit-log/audit-log.constants"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { useAuditDataGridContext } from "~/src/presentation/components/custom/pages/admin/audit/hooks/use-audit-data-grid"

const isAuditLogCategoryFilter = (value: string): value is AuditLogCategoryFilter =>
  (AUDIT_CATEGORY_FILTERS as readonly string[]).includes(value)

const isAuditLogSeverity = (value: string): value is AuditLogSeverity => (AUDIT_LOG_SEVERITIES as readonly string[]).includes(value)

export const AuditCategoryFilter = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  const { activeCategoryFilter, applyAuditFilter } = useAuditDataGridContext()
  const current = activeCategoryFilter
  const options = useMemo(
    () =>
      AUDIT_CATEGORY_FILTERS.map((category) => ({
        label: category === AUDIT_LOG_CATEGORY_FILTER.ALL ? t("audit.filter.allCategories") : t(`audit.categories.${category}`),
        value: category,
      })),
    [t],
  )

  const handleChange = useCallback(
    (value: string | null) => {
      if (value === null) {
        return
      }

      if (!isAuditLogCategoryFilter(value)) {
        return
      }
      applyAuditFilter({
        category: value,
      })
    },
    [applyAuditFilter],
  )

  return (
    <Select items={options} value={current} onValueChange={handleChange}>
      <SelectTrigger
        size="sm"
        className="h-9 w-[200px] gap-2 rounded-lg text-xs data-[size=sm]:h-9"
        aria-label={t("audit.filter.category")}
      >
        <ListFilter className="size-3.5 text-muted-foreground/60" strokeWidth={1.5} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export const AuditSeverityFilter = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  const { activeSeverityFilter, applyAuditFilter } = useAuditDataGridContext()
  const current = activeSeverityFilter ?? ALL_VALUE
  const options = useMemo(
    () => [
      {
        label: t("audit.filter.allSeverities"),
        value: ALL_VALUE,
      },
      ...AUDIT_LOG_SEVERITIES.map((severity) => ({
        label: t(`audit.severity.${severity}`),
        value: severity,
      })),
    ],
    [t],
  )

  const handleChange = useCallback(
    (value: string | null) => {
      if (value === null) {
        return
      }

      if (value === ALL_VALUE) {
        applyAuditFilter({
          severity: undefined,
        })

        return
      }

      if (!isAuditLogSeverity(value)) {
        return
      }
      applyAuditFilter({
        severity: value,
      })
    },
    [applyAuditFilter],
  )

  return (
    <Select items={options} value={current} onValueChange={handleChange}>
      <SelectTrigger
        size="sm"
        className="h-9 w-[200px] gap-2 rounded-lg text-xs data-[size=sm]:h-9"
        aria-label={t("audit.filter.severity")}
      >
        <ListFilter className="size-3.5 text-muted-foreground/60" strokeWidth={1.5} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const ALL_VALUE = "all"

const AUDIT_CATEGORY_FILTERS = [AUDIT_LOG_CATEGORY_FILTER.ALL, ...AUDIT_LOG_CATEGORIES] as const
