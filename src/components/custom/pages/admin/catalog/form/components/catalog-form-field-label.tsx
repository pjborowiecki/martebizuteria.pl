import { type JSX, useMemo } from "react";

import { Info } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";
import { Label } from "~/src/components/shadcn/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/src/components/shadcn/tooltip";

import { buildCatalogFormFieldHint } from "~/src/components/custom/pages/admin/catalog/form/lib/catalog-form-field-hint";

interface CatalogFormFieldLabelProps {
  readonly counter?: string;
  readonly hint?: string;
  readonly label: string;
  readonly required?: boolean;
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
export function CatalogFormFieldLabel({ counter, hint, label, required }: Readonly<CatalogFormFieldLabelProps>): JSX.Element {
  const tAdmin = useTranslations("pages.admin");
  const tooltipHint = buildCatalogFormFieldHint(hint, required, tAdmin("catalogForm.requiredFieldHint"));

  const labelNode = (
    <div className="flex min-h-5 min-w-0 items-center gap-1.5">
      <Label className="text-[13px] leading-5 font-medium text-foreground">{label}</Label>
      {tooltipHint !== undefined && <CatalogFormFieldHintTrigger hint={tooltipHint} />}
    </div>
  );

  if (counter === undefined) {
    return labelNode;
  }

  return (
    <div className="flex min-h-5 w-full items-center justify-between gap-3">
      {labelNode}
      <span className="shrink-0 text-[12px] text-muted-foreground tabular-nums">{counter}</span>
    </div>
  );
}
