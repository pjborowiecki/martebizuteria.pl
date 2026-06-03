import type { JSX } from "react";

/** Leading slash for slug display in catalog datagrid title columns. */
function catalogSlugPath(handle: string): string {
  return handle.startsWith("/") ? handle : `/${handle}`;
}

/**
 * Title + slug stack for collections/categories list rows.
 * Fixed height (matches thumbnail) so toggling the column does not change row height.
 */
export function CatalogTitleHandleCell({ handle, title }: Readonly<{ handle: string; title: string }>): JSX.Element {
  return (
    <div className="flex h-9 min-w-0 flex-col justify-center gap-1">
      <span className="truncate text-xs leading-none font-medium">{title}</span>
      <span className="truncate font-mono text-[10px] leading-none text-muted-foreground">{catalogSlugPath(handle)}</span>
    </div>
  );
}
