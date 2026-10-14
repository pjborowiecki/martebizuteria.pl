import { type JSX, type ReactNode, useMemo } from "react"

import { cn } from "cn"

import { Tooltip, TooltipContent, TooltipTrigger } from "~/src/presentation/components/shadcn/tooltip"

import { ADMIN_STAT_VALUE_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { openTooltipOnlyWhenCut } from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-truncated-text-cell"

export const AdminStatValue = ({ className, value }: Readonly<AdminStatValueProps>): JSX.Element => {
  const trigger = useMemo(() => <p className={cn(ADMIN_STAT_VALUE_CLASS, className)} />, [className])

  return (
    <Tooltip onOpenChange={openTooltipOnlyWhenCut}>
      <TooltipTrigger render={trigger}>{value}</TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  )
}

interface AdminStatValueProps {
  readonly className?: string
  readonly value: ReactNode
}
