import { type JSX } from "react"

import { cn } from "cn"
import { useFormatter, useTranslations } from "use-intl/react"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import {
  ADMIN_CARD_CLASS,
  ADMIN_STAT_CAPTION_SLOT_CLASS,
  ADMIN_STAT_CARD_CONTENT_CLASS,
  ADMIN_STAT_CARD_FILTER_ACTIVE_CLASS,
  ADMIN_STAT_CARD_FILTER_HOVER_CLASS,
  ADMIN_STAT_ICON_CLASS,
  ADMIN_STAT_LABEL_CLASS,
  ADMIN_STAT_VALUE_SLOT_CLASS,
} from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { AdminStatCaption } from "~/src/presentation/components/custom/pages/admin/admin-stat-caption"
import { AdminStatValue } from "~/src/presentation/components/custom/pages/admin/admin-stat-value"
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

export const AuditStatCard = ({
  caption,
  config,
  displayValue,
  isActive,
  onFilter,
  valuesPending,
}: Readonly<AuditStatCardProps>): JSX.Element => {
  const t = useTranslations("pages.admin")
  const format = useFormatter()
  const { gradient, icon: Icon, key } = config

  return (
    <Card
      className={cn(
        "h-full gap-0 py-0",
        ADMIN_CARD_CLASS,
        "bg-gradient-to-br from-transparent",
        gradient,
        ADMIN_STAT_CARD_FILTER_HOVER_CLASS,
        isActive && ADMIN_STAT_CARD_FILTER_ACTIVE_CLASS,
      )}
    >
      <button
        type="button"
        aria-pressed={isActive}
        aria-busy={valuesPending}
        className="block h-full w-full cursor-pointer border-0 bg-transparent p-0 text-left shadow-none outline-none focus:outline-none focus-visible:outline-none"
        onClick={onFilter}
      >
        <CardContent className={ADMIN_STAT_CARD_CONTENT_CLASS}>
          <div className="min-w-0 flex-1 space-y-2">
            <p className={ADMIN_STAT_LABEL_CLASS}>{t(resolveStatLabelKey(key))}</p>
            <div className={ADMIN_STAT_VALUE_SLOT_CLASS}>
              {valuesPending ? <Skeleton className="h-8 w-20" /> : <AdminStatValue value={format.number(displayValue ?? 0)} />}
            </div>
            <div className={ADMIN_STAT_CAPTION_SLOT_CLASS}>
              <AdminStatCaption caption={caption} valuesPending={valuesPending} />
            </div>
          </div>
          <div className={ADMIN_STAT_ICON_CLASS}>
            <Icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
          </div>
        </CardContent>
      </button>
    </Card>
  )
}

interface AuditStatCardProps {
  readonly caption?: string | undefined
  readonly config: AuditStatCardConfig
  readonly displayValue?: number | undefined
  readonly isActive: boolean
  readonly onFilter: () => void
  readonly valuesPending: boolean
}
