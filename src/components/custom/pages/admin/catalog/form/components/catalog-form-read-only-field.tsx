import type { JSX } from "react";

import { cn } from "~/src/lib/utils";

import { Field } from "~/src/components/shadcn/field";
import { Input } from "~/src/components/shadcn/input";

import { CatalogFormFieldLabel } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-field-label";
import { CATALOG_SHEET_READ_ONLY_INPUT_CLASS } from "~/src/components/custom/pages/admin/catalog/form/lib/catalog-form.styles";

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
      <Input readOnly value={value} aria-readonly className={cn(CATALOG_SHEET_READ_ONLY_INPUT_CLASS)} />
    </Field>
  );
}
