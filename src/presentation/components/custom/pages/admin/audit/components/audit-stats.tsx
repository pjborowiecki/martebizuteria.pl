import { type JSX } from "react"

import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { resolveAuditLogToday } from "~/src/modules/audit-log/audit-log.utils"
import { getAuditLogStatsQuery } from "~/src/modules/audit-log/use-cases/get-audit-log-stats"

import { ADMIN_STAT_GRID_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { AUDIT_STAT_CARDS, type AuditStatKey } from "~/src/presentation/components/custom/pages/admin/audit/audit-stats.config"
import { AuditStatCard } from "~/src/presentation/components/custom/pages/admin/audit/components/audit-stat-card"
import { useAuditDataGridContext } from "~/src/presentation/components/custom/pages/admin/audit/hooks/use-audit-data-grid"
import { useAuditLogToday } from "~/src/presentation/components/custom/pages/admin/audit/hooks/use-audit-log-today"
import {
  ALL_AUDIT_EVENTS_FILTERS,
  buildAuditStatCardFilters,
  isAuditStatCardFilterActive,
} from "~/src/presentation/components/custom/pages/admin/audit/utils/audit-stat-card-filters"

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
  }
}

export const AuditStats = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  const { activeDateFilter, activeSeverityFilter, applyAuditFilter } = useAuditDataGridContext()
  const today = useAuditLogToday()
  const { data, isPending } = useQuery(getAuditLogStatsQuery(today))
  const activeFilters = { createdAt: activeDateFilter, severity: activeSeverityFilter }
  const stats = {
    errorCount: data?.errorCount ?? 0,
    todayCount: data?.todayCount ?? 0,
    totalCount: data?.totalCount ?? 0,
    warningCount: data?.warningCount ?? 0,
  }

  return (
    <div className={ADMIN_STAT_GRID_CLASS}>
      {AUDIT_STAT_CARDS.map((config) => {
        const value = resolveStatValue(config.key, stats)
        const isActive = isAuditStatCardFilterActive(buildAuditStatCardFilters(config, today), activeFilters)
        const caption = isPending
          ? undefined
          : buildAuditStatCaption({
              key: config.key,
              stats,
              t,
              value,
            })

        return (
          <AuditStatCard
            key={config.key}
            caption={caption}
            config={config}
            displayValue={isPending ? undefined : value}
            isActive={isActive}
            onFilter={() => {
              applyAuditFilter(isActive ? ALL_AUDIT_EVENTS_FILTERS : buildAuditStatCardFilters(config, resolveAuditLogToday()))
            }}
            valuesPending={isPending}
          />
        )
      })}
    </div>
  )
}

const PERCENT_SCALE = 100
