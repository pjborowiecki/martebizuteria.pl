import { type JSX } from "react"

import { cn } from "cn"
import { useFormatter, useTranslations } from "use-intl/react"

import { type AuditLogSeverity } from "~/src/modules/audit-log/audit-log.constants"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import {
  ADMIN_CARD_CLASS,
  ADMIN_STAT_CAPTION_SLOT_CLASS,
  ADMIN_STAT_CARD_FILTER_ACTIVE_CLASS,
  ADMIN_STAT_CARD_FILTER_HOVER_CLASS,
  ADMIN_STAT_LABEL_CLASS,
  ADMIN_STAT_VALUE_CLASS,
  ADMIN_STAT_VALUE_SLOT_CLASS,
} from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { AdminStatCaption } from "~/src/presentation/components/custom/pages/admin/admin-stat-caption"
import { type AuditStatCardConfig, type AuditStatKey } from "~/src/presentation/components/custom/pages/admin/audit/audit-stats.config"

const resolveStatLabelKey = (
  key: AuditStatKey,
): "audit.stats.errors" | "audit.stats.today" | "audit.stats.totalEvents" | "audit.stats.warnings" => {
  switch (key) {
    case "errors": {
      return "audit.stats.errors"
    }
    case "today": {
      return "audit.stats.today"
    }
    case "total": {
      return "audit.stats.totalEvents"
    }
    case "warnings": {
      return "audit.stats.warnings"
    }
  }
}

const resolveIsActive = ({ activeSeverityFilter, activeTodayFilter, config }: Readonly<IsActiveInput>): boolean => {
  if (config.key === "total") {
    return activeSeverityFilter === undefined && !activeTodayFilter
  }

  if (config.key === "today") {
    return activeTodayFilter
  }

  return activeSeverityFilter === config.filterSeverity
}

const resolveFilterAction = ({ config, isActive, onFilter, onTodayFilter }: Readonly<FilterActionInput>): (() => void) | undefined => {
  if (config.key === "today") {
    return onTodayFilter
  }

  if (onFilter === undefined) {
    return undefined
  }

  if (config.key === "total" || isActive) {
    return () => {
      onFilter()
    }
  }

  const { filterSeverity } = config

  return () => {
    onFilter(filterSeverity)
  }
}

export const AuditStatCard = ({
  activeSeverityFilter,
  activeTodayFilter = false,
  caption,
  config,
  displayValue,
  onFilter,
  onTodayFilter,
  valuesPending,
}: Readonly<AuditStatCardProps>): JSX.Element => {
  const t = useTranslations("pages.admin")
  const format = useFormatter()
  const { gradient, icon: Icon, key } = config
  const isActive = resolveIsActive({ activeSeverityFilter, activeTodayFilter, config })
  const filterAction = resolveFilterAction({ config, isActive, onFilter, onTodayFilter })
  const isFilterable = filterAction !== undefined

  const cardClassName = cn(
    "h-full gap-0 py-0",
    ADMIN_CARD_CLASS,
    "bg-gradient-to-br from-transparent",
    gradient,
    isFilterable && !valuesPending && ADMIN_STAT_CARD_FILTER_HOVER_CLASS,
    isFilterable && isActive && ADMIN_STAT_CARD_FILTER_ACTIVE_CLASS,
  )

  const content = (
    <CardContent className="flex h-full items-start justify-between gap-4 p-5">
      <div className="min-w-0 flex-1 space-y-2">
        <p className={ADMIN_STAT_LABEL_CLASS}>{t(resolveStatLabelKey(key))}</p>
        <div className={ADMIN_STAT_VALUE_SLOT_CLASS}>
          {valuesPending ? <Skeleton className="h-8 w-20" /> : <p className={ADMIN_STAT_VALUE_CLASS}>{format.number(displayValue ?? 0)}</p>}
        </div>
        <div className={ADMIN_STAT_CAPTION_SLOT_CLASS}>
          <AdminStatCaption caption={caption} valuesPending={valuesPending} />
        </div>
      </div>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary shadow-none">
        <Icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
      </div>
    </CardContent>
  )

  if (!isFilterable) {
    return <Card className={cardClassName}>{content}</Card>
  }

  return (
    <Card className={cardClassName}>
      <button
        type="button"
        aria-pressed={isActive}
        aria-busy={valuesPending}
        disabled={valuesPending}
        className="block h-full w-full cursor-pointer border-0 bg-transparent p-0 text-left shadow-none outline-none focus:outline-none focus-visible:outline-none disabled:cursor-default"
        onClick={filterAction}
      >
        {content}
      </button>
    </Card>
  )
}

interface FilterActionInput {
  readonly config: AuditStatCardConfig
  readonly isActive: boolean
  readonly onFilter: AuditStatCardProps["onFilter"]
  readonly onTodayFilter: AuditStatCardProps["onTodayFilter"]
}

interface IsActiveInput {
  readonly activeSeverityFilter: AuditLogSeverity | undefined
  readonly activeTodayFilter: boolean
  readonly config: AuditStatCardConfig
}

interface AuditStatCardProps {
  readonly activeSeverityFilter?: AuditLogSeverity | undefined
  readonly activeTodayFilter?: boolean | undefined
  readonly caption?: string | undefined
  readonly config: AuditStatCardConfig
  readonly displayValue?: number | undefined
  readonly onFilter?: ((severity?: AuditLogSeverity) => void) | undefined
  readonly onTodayFilter?: (() => void) | undefined
  readonly valuesPending: boolean
}
