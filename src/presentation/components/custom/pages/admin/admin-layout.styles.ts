/** Matches `:root --sidebar`; fills viewport + `scrollbar-gutter` behind the main column. */
export const ADMIN_SHELL_CHROME_BG = "oklch(0.141 0.005 285.823)"

export const ADMIN_LAYOUT_BG_CLASS = "bg-zinc-100"

export const ADMIN_CARD_CLASS = "gap-0 border-border/60 bg-card py-0 shadow-none ring-0"

export const ADMIN_STAT_CARD_FILTER_HOVER_CLASS = "transition-[border-color] hover:border-foreground/25"

export const ADMIN_STAT_CARD_FILTER_ACTIVE_CLASS = "border-foreground/35 ring-0 shadow-none"

export const ADMIN_RADIUS_CLASS = "rounded-lg"

/** `min-w-0` prevents wide grids from expanding the page beyond the viewport. */
export const ADMIN_PAGE_BODY_CLASS = "min-w-0 flex-1 space-y-5 p-8"

export const ADMIN_CATALOG_PAGE_BODY_CLASS = "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-8"

export const ADMIN_CATALOG_DATAGRID_PAGE_CLASS =
  "flex h-fit max-h-full min-h-0 w-full flex-col gap-5 overflow-hidden [&>:first-child]:shrink-0"
