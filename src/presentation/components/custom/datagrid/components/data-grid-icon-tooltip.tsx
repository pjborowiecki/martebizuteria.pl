import { type JSX, type ReactElement } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "~/src/presentation/components/shadcn/tooltip"

interface DataGridIconTooltipProps {
  readonly label: string
  readonly trigger: ReactElement
}

/** Hover label for icon-only datagrid toolbar controls. */
export const DataGridIconTooltip = ({ label, trigger }: DataGridIconTooltipProps): JSX.Element => (
  <Tooltip>
    <TooltipTrigger render={trigger} />
    <TooltipContent side="bottom">{label}</TooltipContent>
  </Tooltip>
)
