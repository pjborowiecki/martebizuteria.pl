import { type JSX } from "react"

import { cn } from "cn"

import { Badge } from "~/src/presentation/components/shadcn/badge"

export const SettingsStatusBadge = ({ label, tone }: Readonly<SettingsStatusBadgeProps>): JSX.Element => (
  <Badge className={cn("h-5 border-0 px-2 py-0.5 text-[11px] font-medium", SETTINGS_STATUS_BADGE_CLASS[tone])} variant="outline">
    {label}
  </Badge>
)

const SETTINGS_STATUS_BADGE_CLASS = {
  negative: "bg-red-500/10 text-red-600 dark:text-red-400",
  neutral: "bg-muted text-muted-foreground",
  positive: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
} as const

export type SettingsStatusTone = keyof typeof SETTINGS_STATUS_BADGE_CLASS

interface SettingsStatusBadgeProps {
  readonly label: string
  readonly tone: SettingsStatusTone
}
