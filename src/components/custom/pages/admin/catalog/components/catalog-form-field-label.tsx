import { type JSX, useMemo } from "react";

import { Info } from "lucide-react";

import { Button } from "~/src/components/shadcn/button";
import { Label } from "~/src/components/shadcn/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/src/components/shadcn/tooltip";

interface CatalogFormFieldLabelProps {
  readonly counter?: string;
  readonly hint?: string;
  readonly label: string;
}

function CatalogFormFieldHintTrigger({ hint }: Readonly<{ hint: string }>): JSX.Element {
  const trigger = useMemo(
    () => (
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="size-5 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={hint}
      >
        <Info className="size-3.5" strokeWidth={1.75} />
      </Button>
    ),
    [hint]
  );

  return (
    <Tooltip>
      <TooltipTrigger render={trigger} />
      <TooltipContent side="top" className="max-w-xs text-left">
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}

/** Field label with an optional info tooltip (catalog create/edit sheets). */
export function CatalogFormFieldLabel({ counter, hint, label }: Readonly<CatalogFormFieldLabelProps>): JSX.Element {
  const labelNode = (
    <div className="flex min-w-0 items-center gap-1.5">
      <Label className="text-[13px] font-medium text-foreground">{label}</Label>
      {hint !== undefined && <CatalogFormFieldHintTrigger hint={hint} />}
    </div>
  );

  if (counter === undefined) {
    return labelNode;
  }

  return (
    <div className="flex w-full items-center justify-between gap-3">
      {labelNode}
      <span className="shrink-0 text-[12px] text-muted-foreground tabular-nums">{counter}</span>
    </div>
  );
}
