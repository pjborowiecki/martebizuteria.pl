import type { JSX } from "react";

import { cn } from "~/src/lib/utils";

import { Field } from "~/src/components/shadcn/field";
import { Input } from "~/src/components/shadcn/input";

import { CatalogFormFieldLabel } from "~/src/components/custom/pages/admin/catalog/components/catalog-form-field-label";

const READ_ONLY_INPUT_CLASS =
  "min-h-10 cursor-default rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-sm text-muted-foreground shadow-none focus-visible:ring-0";

interface CatalogFormReadOnlyFieldProps {
  readonly hint?: string;
  readonly label: string;
  readonly value: string;
}

/** Read-only identifier shown when editing an existing catalog row. */
export function CatalogFormReadOnlyField({ hint, label, value }: Readonly<CatalogFormReadOnlyFieldProps>): JSX.Element {
  return (
    <Field className="gap-2">
      <CatalogFormFieldLabel hint={hint} label={label} />
      <Input readOnly value={value} aria-readonly className={cn(READ_ONLY_INPUT_CLASS)} />
    </Field>
  );
}
