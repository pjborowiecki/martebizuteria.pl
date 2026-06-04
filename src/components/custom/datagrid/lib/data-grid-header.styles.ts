/** Shared chrome for datagrid header rows (muted gray band, distinct from white body rows). */
export const DATA_GRID_HEADER_ROW_CLASS = "border-border/60 bg-muted hover:bg-muted";

export const DATA_GRID_HEADER_CELL_CLASS =
  "group/head sticky top-0 z-10 h-11 border-b border-border/60 bg-muted text-xs font-medium tracking-wide text-muted-foreground normal-case transition-colors hover:bg-muted hover:text-foreground";

/** Applied when this column is the active sort — darker than the default header band. */
export const DATA_GRID_HEADER_CELL_SORTED_CLASS =
  "bg-neutral-200 text-foreground hover:bg-neutral-200 dark:bg-neutral-800 dark:text-foreground dark:hover:bg-neutral-800";

export const DATA_GRID_HEADER_SORT_BUTTON_CLASS = "inline-flex items-center gap-1.5 text-inherit transition-colors hover:text-foreground";
