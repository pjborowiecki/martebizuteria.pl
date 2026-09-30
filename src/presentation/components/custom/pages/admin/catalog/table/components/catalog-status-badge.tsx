import { type JSX } from "react"

import { cn } from "cn"

import { Badge } from "~/src/presentation/components/shadcn/badge"

export const CatalogStatusBadge = ({
  isActive,
  label,
}: Readonly<{
  isActive: boolean
  label: string
}>): JSX.Element => (
  <Badge
    variant="outline"
    className={cn(
      "h-5 border-0 px-2 py-0.5 text-[11px] font-medium",
      isActive ? CATALOG_STATUS_BADGE_CLASS.active : CATALOG_STATUS_BADGE_CLASS.draft,
    )}
  >
    {label}
  </Badge>
)

const CATALOG_STATUS_BADGE_CLASS = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  draft: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
} as const
