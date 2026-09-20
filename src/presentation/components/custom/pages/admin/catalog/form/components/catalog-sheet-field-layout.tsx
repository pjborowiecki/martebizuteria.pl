import { type JSX, type ReactNode } from "react"

import { cn } from "cn"

import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"

export const CatalogSheetControlColumn = ({
  children,
  className,
  counter,
  hint,
  label,
}: Readonly<CatalogSheetControlColumnProps>): JSX.Element => (
  <div className={cn("flex min-w-0 flex-1 flex-col gap-2", className)}>
    <CatalogFormFieldLabel counter={counter} hint={hint} label={label} />
    {children}
  </div>
)

export const CatalogSheetControlsActionRow = ({
  children,
}: Readonly<{
  children: ReactNode
}>): JSX.Element => <div className="flex items-start gap-2">{children}</div>

/** Align actions with the 40px controls beneath their labels. */
export const CatalogSheetActionColumn = ({
  children,
}: Readonly<{
  children: ReactNode
}>): JSX.Element => (
  <div className="flex shrink-0 flex-col gap-2">
    <div aria-hidden className="min-h-5" />
    {children}
  </div>
)

interface CatalogSheetControlColumnProps {
  readonly children: ReactNode
  readonly className?: string
  readonly counter?: string
  readonly hint?: string
  readonly label: string
}
