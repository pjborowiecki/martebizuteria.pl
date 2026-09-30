import { type JSX, type ReactElement, type ReactNode } from "react"

import { Button } from "~/src/presentation/components/shadcn/button"

export const CatalogToolbarAddButton = ({ children, onClick, render }: CatalogToolbarAddButtonProps): JSX.Element => (
  <Button type="button" size="sm" className={catalogToolbarAddButtonClassName} onClick={onClick} render={render}>
    {children}
  </Button>
)

export const catalogToolbarAddButtonClassName =
  "h-9 cursor-pointer bg-foreground px-4 text-[13px] text-background shadow-none transition-colors hover:bg-foreground/80"

interface CatalogToolbarAddButtonProps {
  readonly children: ReactNode
  readonly onClick?: () => void
  readonly render?: ReactElement
}
