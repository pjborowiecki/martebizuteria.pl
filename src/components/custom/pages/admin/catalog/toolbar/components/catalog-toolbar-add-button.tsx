import type { JSX, ReactElement, ReactNode } from "react";

import { Button } from "~/src/components/shadcn/button";

/** Primary “add” action in catalog datagrid toolbars (`rounded-lg` from Button). */
export const catalogToolbarAddButtonClassName =
  "h-9 cursor-pointer bg-foreground px-4 text-[13px] text-background shadow-none transition-colors hover:bg-foreground/80";

interface CatalogToolbarAddButtonProps {
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly render?: ReactElement;
}

export function CatalogToolbarAddButton({ children, onClick, render }: CatalogToolbarAddButtonProps): JSX.Element {
  return (
    <Button type="button" size="sm" className={catalogToolbarAddButtonClassName} onClick={onClick} render={render}>
      {children}
    </Button>
  );
}
