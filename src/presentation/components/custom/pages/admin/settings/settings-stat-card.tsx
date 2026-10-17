import { type JSX } from "react"

import { cn } from "cn"
import { type LucideIcon } from "lucide-react"

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
} from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { AdminStatCaption } from "~/src/presentation/components/custom/pages/admin/admin-stat-caption"
import { AdminStatValue } from "~/src/presentation/components/custom/pages/admin/admin-stat-value"

export const SettingsStatCard = ({
  caption,
  config,
  label,
  onFilter,
  pressed,
  value,
  valuesPending,
}: Readonly<SettingsStatCardProps>): JSX.Element => {
  const { gradient, icon: Icon } = config
  const cardClassName = cn(
    "h-full gap-0 py-0",
    ADMIN_CARD_CLASS,
    "bg-gradient-to-br from-transparent",
    gradient,
    onFilter !== undefined && !valuesPending && ADMIN_STAT_CARD_FILTER_HOVER_CLASS,
    onFilter !== undefined && pressed && ADMIN_STAT_CARD_FILTER_ACTIVE_CLASS,
  )
  const content = (
    <CardContent className={ADMIN_STAT_CARD_CONTENT_CLASS}>
      <div className="min-w-0 flex-1 space-y-2">
        <p className={ADMIN_STAT_LABEL_CLASS}>{label}</p>
        <div className={ADMIN_STAT_VALUE_SLOT_CLASS}>
          {valuesPending ? <Skeleton className="h-8 w-20" /> : <AdminStatValue value={value} />}
        </div>
        <div className={ADMIN_STAT_CAPTION_SLOT_CLASS}>
          <AdminStatCaption caption={caption} valuesPending={valuesPending} />
        </div>
      </div>
      <div className={ADMIN_STAT_ICON_CLASS}>
        <Icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
      </div>
    </CardContent>
  )

  if (onFilter === undefined) {
    return <Card className={cardClassName}>{content}</Card>
  }

  return (
    <Card className={cardClassName}>
      <button
        aria-busy={valuesPending}
        aria-pressed={pressed}
        className="block h-full w-full cursor-pointer border-0 bg-transparent p-0 text-left shadow-none outline-none focus:outline-none focus-visible:outline-none disabled:cursor-default"
        disabled={valuesPending}
        onClick={onFilter}
        type="button"
      >
        {content}
      </button>
    </Card>
  )
}

export interface SettingsStatCardConfig {
  readonly gradient: string
  readonly icon: LucideIcon
}

interface SettingsStatCardProps {
  readonly caption?: string | undefined
  readonly config: SettingsStatCardConfig
  readonly label: string
  readonly onFilter?: (() => void) | undefined
  readonly pressed: boolean
  readonly value: string
  readonly valuesPending: boolean
}
