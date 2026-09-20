import { type JSX } from "react"

import { cn } from "cn"

import { Field } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import { CATALOG_SHEET_READ_ONLY_INPUT_CLASS } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.styles"

export const CatalogFormReadOnlyField = ({ hint, label, value }: Readonly<CatalogFormReadOnlyFieldProps>): JSX.Element => (
  <Field className="gap-2">
    <CatalogFormFieldLabel hint={hint} label={label} />
    <Input readOnly value={value} aria-readonly className={cn(CATALOG_SHEET_READ_ONLY_INPUT_CLASS)} />
  </Field>
)

interface CatalogFormReadOnlyFieldProps {
  readonly hint?: string
  readonly label: string
  readonly value: string
}
