import { type JSX, useMemo } from "react";

import { cn } from "~/src/lib/utils";

import { Tooltip, TooltipContent, TooltipTrigger } from "~/src/components/shadcn/tooltip";

/** Muted body text in catalog datagrids — inherits table `text-xs`, no size override. */
export const CATALOG_DATAGRID_MUTED_TEXT_CLASS = "block min-w-0 cursor-default truncate text-muted-foreground";

export const CATALOG_DATAGRID_EMPTY_TEXT_CLASS = "text-muted-foreground/40";

interface CatalogTruncatedTextCellProps {
  readonly className?: string;
  readonly text: string;
  readonly muted?: boolean;
}

/** Truncated catalog table text with optional tooltip (descriptions, allowed values, etc.). */
export function CatalogTruncatedTextCell({ className, muted = true, text }: Readonly<CatalogTruncatedTextCellProps>): JSX.Element {
  const trigger = useMemo(
    () => <span className={cn(muted ? CATALOG_DATAGRID_MUTED_TEXT_CLASS : "block min-w-0 truncate", className)}>{text}</span>,
    [className, muted, text]
  );

  if (text === "") {
    return <span className={CATALOG_DATAGRID_EMPTY_TEXT_CLASS}>—</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={trigger} />
      <TooltipContent className="max-w-sm whitespace-normal">{text}</TooltipContent>
    </Tooltip>
  );
}
