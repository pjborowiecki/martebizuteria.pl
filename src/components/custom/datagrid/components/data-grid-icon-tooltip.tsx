import type { JSX, ReactElement } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "~/src/components/shadcn/tooltip";

interface DataGridIconTooltipProps {
  readonly label: string;
  readonly trigger: ReactElement;
}

/** Hover label for icon-only datagrid toolbar controls. */
export function DataGridIconTooltip({ label, trigger }: DataGridIconTooltipProps): JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger render={trigger} />
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
