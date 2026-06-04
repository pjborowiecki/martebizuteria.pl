import type { JSX, ReactNode } from "react";

import { cn } from "~/src/lib/utils";

import { CatalogFormFieldLabel } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-field-label";

interface CatalogSheetControlColumnProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly counter?: string;
  readonly hint?: string;
  readonly label: string;
}

/** Label (with optional inline counter) + control — used in multi-column sheet rows. */
export function CatalogSheetControlColumn({
  children,
  className,
  counter,
  hint,
  label
}: Readonly<CatalogSheetControlColumnProps>): JSX.Element {
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-2", className)}>
      <CatalogFormFieldLabel counter={counter} hint={hint} label={label} />
      {children}
    </div>
  );
}

/** Control columns with a trailing action button; labels stay top-aligned. */
export function CatalogSheetControlsActionRow({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  return <div className="flex items-start gap-2">{children}</div>;
}

/** Aligns a sheet action button with 40px inputs below sibling label rows. */
export function CatalogSheetActionColumn({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <div aria-hidden className="min-h-5" />
      {children}
    </div>
  );
}
