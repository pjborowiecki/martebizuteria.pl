import { cn } from "cn"

export const adminColumnFilterTriggerClass = (isActive: boolean): string =>
  cn(
    "inline-flex h-9 max-w-[min(100%,240px)] cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-2.5 text-xs font-normal outline-none select-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
    isActive && "border-primary/40 bg-primary/5 text-foreground",
  )
