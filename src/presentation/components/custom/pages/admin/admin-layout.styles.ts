import { cn } from "cn"

export const ADMIN_SHELL_CHROME_BG = "oklch(0.141 0.005 285.823)"

export const ADMIN_LAYOUT_BG_CLASS = "bg-zinc-100"

export const ADMIN_CARD_CLASS = "gap-0 border-border/60 bg-card py-0 shadow-none ring-0"

export const ADMIN_STAT_CARD_FILTER_HOVER_CLASS = "transition-[border-color] hover:border-foreground/25"

export const ADMIN_STAT_CARD_FILTER_ACTIVE_CLASS = "border-foreground/35 ring-0 shadow-none"

export const ADMIN_STAT_GRID_CLASS = "grid shrink-0 grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"

export const ADMIN_CARD_CONTENT_CLASS = "p-4 lg:p-5"

export const ADMIN_STAT_CARD_CONTENT_CLASS = cn("flex h-full items-start justify-between gap-3 lg:gap-4", ADMIN_CARD_CONTENT_CLASS)

export const ADMIN_STAT_ICON_CLASS = "hidden size-9 shrink-0 items-center justify-center rounded-lg bg-secondary shadow-none sm:flex"

export const ADMIN_STAT_LABEL_CLASS = "text-[13px] leading-5 wrap-break-word text-muted-foreground"

export const ADMIN_STAT_VALUE_CLASS =
  "min-w-0 truncate text-xl leading-7 font-semibold tracking-tight tabular-nums sm:text-2xl sm:leading-8 lg:text-3xl lg:leading-9"

export const ADMIN_STAT_VALUE_SLOT_CLASS = "flex min-h-7 items-center sm:min-h-8 lg:min-h-9"

export const ADMIN_STAT_CAPTION_SLOT_CLASS = "flex min-h-4 items-center"

export const ADMIN_STAT_CAPTION_CLASS = "text-xs text-muted-foreground/80"

export const ADMIN_PAGE_BODY_CLASS = "min-h-0 flex-1 p-4 sm:p-6 lg:overflow-y-auto lg:p-8"

export const ADMIN_CATALOG_PAGE_BODY_CLASS = "flex min-h-0 min-w-0 flex-1 flex-col p-4 sm:p-6 lg:overflow-hidden lg:p-8"

export const ADMIN_CATALOG_DATAGRID_PAGE_CLASS =
  "flex h-fit max-h-full min-h-0 w-full flex-col gap-5 overflow-hidden [&>:first-child]:shrink-0"

export const ADMIN_HEADER_PRIMARY_BUTTON_CLASS =
  "h-8 gap-1.5 bg-foreground px-4 text-[13px] text-background hover:bg-foreground/90 pointer-coarse:h-10"

export const ADMIN_DASHBOARD_STAT_GRID_CLASS = "grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4"

export const ADMIN_DASHBOARD_CONTENT_CARD_CLASS = "border-border/40 shadow-none max-lg:py-0"

export const ADMIN_HEADER_SECONDARY_BUTTON_CLASS =
  "h-8 gap-1.5 border-sidebar-border bg-sidebar px-3 text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground pointer-coarse:h-10"
