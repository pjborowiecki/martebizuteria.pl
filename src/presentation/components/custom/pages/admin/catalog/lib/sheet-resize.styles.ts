import { cn } from "cn"

export const CATALOG_SHEET_PANEL_CLASS = cn(
  "flex h-full flex-col gap-0 border-l border-border bg-background p-0 text-foreground shadow-none",
  "data-[side=right]:!w-[min(var(--catalog-form-sheet-width),100%)] data-[side=right]:!max-w-[var(--catalog-form-sheet-width)] data-[side=right]:!min-w-0",
)

export const CATALOG_SHEET_RESIZE_HANDLE_CLASS =
  "group/sheet-resize absolute top-0 left-0 z-10 hidden h-full w-3 -translate-x-1/2 cursor-col-resize touch-none justify-center select-none"

export const CATALOG_SHEET_RESIZE_LINE_CLASS =
  "h-full w-px bg-transparent transition-colors group-hover/sheet-resize:bg-foreground/50 group-active/sheet-resize:w-[2px] group-active/sheet-resize:bg-foreground"
