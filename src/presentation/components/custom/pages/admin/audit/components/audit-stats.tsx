import { type JSX, useCallback } from "react"

import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl"

import { type AuditLogSeverity } from "~/src/modules/audit-log/audit-log.constants"
import { adminAuditLogStatsQueryOptions } from "~/src/modules/audit-log/use-cases/get-audit-log-stats"

import { AUDIT_STAT_CARDS, type AuditStatKey } from "~/src/presentation/components/custom/pages/admin/audit/audit-stats.config"
import { AuditStatCard } from "~/src/presentation/components/custom/pages/admin/audit/components/audit-stat-card"
import { useAuditDataGridContext } from "~/src/presentation/components/custom/pages/admin/audit/hooks/use-audit-data-grid"
import {
  buildAuditTodayCreatedAtFilter,
  isAuditTodayCreatedAtFilter,
} from "~/src/presentation/components/custom/pages/admin/audit/utils/audit-today-date-filter"
const buildAuditStatCaption = ({
  key,
  stats,
  t,
  value,
}: Readonly<{
  key: AuditStatKey
  stats: {
    errorCount: number
    todayCount: number
    totalCount: number
    warningCount: number
  }
  t: ReturnType<typeof useTranslations<"pages.admin">>
  value: number
}>): string | undefined => {
  if (key === "total") {
    return undefined
  }
  if (stats.totalCount <= 0) {
    return undefined
  }
  const percent = Math.round((value / stats.totalCount) * PERCENT_SCALE)
  return t("audit.stats.shareCaption", {
    percent,
  })
}
const resolveStatCardFilterHandlers = (
  key: AuditStatKey,
  handlers: Readonly<{
    applySeverityFilter: (severity?: AuditLogSeverity) => void
    applyTodayFilter: () => void
    applyTotalFilter: () => void
  }>,
): Readonly<{
  onFilter?: (severity?: AuditLogSeverity) => void
  onTodayFilter?: () => void
}> => {
  if (key === "today") {
    return {
      onTodayFilter: handlers.applyTodayFilter,
    }
  }
  if (key === "total") {
    return {
      onFilter: handlers.applyTotalFilter,
    }
  }
  return {
    onFilter: handlers.applySeverityFilter,
  }
}
const resolveStatValue = (
  key: (typeof AUDIT_STAT_CARDS)[number]["key"],
  stats: {
    errorCount: number
    todayCount: number
    totalCount: number
    warningCount: number
  },
): number => {
  switch (key) {
    case "errors": {
      return stats.errorCount
    }
    case "today": {
      return stats.todayCount
    }
    case "total": {
      return stats.totalCount
    }
    case "warnings": {
      return stats.warningCount
    }
    default: {
      return 0
    }
  }
}
export const AuditStats = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  const { activeDateFilter, activeSeverityFilter, applyAuditFilter } = useAuditDataGridContext()
  const { data, isFetching, isStale } = useQuery(adminAuditLogStatsQueryOptions())
  const valuesPending = isFetching && isStale
  const activeTodayFilter = isAuditTodayCreatedAtFilter(activeDateFilter)
  const stats = {
    errorCount: data?.errorCount ?? 0,
    todayCount: data?.todayCount ?? 0,
    totalCount: data?.totalCount ?? 0,
    warningCount: data?.warningCount ?? 0,
  }
  const applySeverityFilter = useCallback(
    (severity?: AuditLogSeverity) => {
      applyAuditFilter({
        severity,
      })
    },
    [applyAuditFilter],
  )
  const applyTotalFilter = useCallback(() => {
    applyAuditFilter({
      createdAt: undefined,
      severity: undefined,
    })
  }, [applyAuditFilter])
  const applyTodayFilter = useCallback(() => {
    applyAuditFilter({
      createdAt: activeTodayFilter ? undefined : buildAuditTodayCreatedAtFilter(),
    })
  }, [activeTodayFilter, applyAuditFilter])
  return (
    <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {AUDIT_STAT_CARDS.map((config) => {
        const value = resolveStatValue(config.key, stats)
        const caption = valuesPending
          ? undefined
          : buildAuditStatCaption({
              key: config.key,
              stats,
              t,
              value,
            })
        const { onFilter, onTodayFilter } = resolveStatCardFilterHandlers(config.key, {
          applySeverityFilter,
          applyTodayFilter,
          applyTotalFilter,
        })
        return (
          <AuditStatCard
            key={config.key}
            activeSeverityFilter={activeSeverityFilter}
            activeTodayFilter={activeTodayFilter}
            caption={caption}
            config={config}
            displayValue={valuesPending ? undefined : value}
            onFilter={onFilter}
            onTodayFilter={onTodayFilter}
            valuesPending={valuesPending}
          />
        )
      })}
    </div>
  )
}
const PERCENT_SCALE = 100
