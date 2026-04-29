import type { JSX } from "react";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

const DEFAULT_DELAY = 0;

export function TooltipProvider({ delay = DEFAULT_DELAY, ...props }: Readonly<TooltipPrimitive.Provider.Props>): JSX.Element {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} {...props} />;
}
