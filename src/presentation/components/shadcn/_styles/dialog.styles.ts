export const DIALOG_VARIANTS = ["default", "editorial"] as const

export type DialogVariant = (typeof DIALOG_VARIANTS)[number]

export const DIALOG_OVERLAY_CLASS =
  "fixed inset-0 isolate z-50 bg-zinc-950/40 duration-150 supports-backdrop-filter:backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"

export const DIALOG_SURFACE_CLASS = [
  "group/dialog-surface fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-5 bg-popover p-6",
  "text-[13px]/relaxed text-popover-foreground outline-none duration-150",
  "rounded-xl border border-border/70 shadow-[0_24px_64px_-16px_rgb(9_9_11/0.4)]",
  "data-[variant=editorial]:gap-6 data-[variant=editorial]:rounded-none data-[variant=editorial]:border-border",
  "data-[variant=editorial]:shadow-[0_32px_96px_-24px_rgb(9_9_11/0.35)] sm:data-[variant=editorial]:p-8",
  "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
].join(" ")

export const DIALOG_HEADER_CLASS =
  "flex flex-col gap-1.5 text-left group-data-[variant=editorial]/dialog-surface:gap-3 group-data-[variant=editorial]/dialog-surface:pb-4"

export const DIALOG_TITLE_CLASS = [
  "text-base leading-6 font-semibold tracking-tight text-foreground",
  "group-data-[variant=editorial]/dialog-surface:font-serif group-data-[variant=editorial]/dialog-surface:text-[28px]",
  "group-data-[variant=editorial]/dialog-surface:leading-[1.15] group-data-[variant=editorial]/dialog-surface:font-normal",
  "group-data-[variant=editorial]/dialog-surface:tracking-[-0.01em]",
].join(" ")

export const DIALOG_DESCRIPTION_CLASS =
  "text-[13px] leading-relaxed text-pretty text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground"

export const DIALOG_FOOTER_CLASS = [
  "-mx-6 -mb-6 mt-1 flex flex-col-reverse gap-2 rounded-b-xl border-t border-border/70 bg-muted/40 px-6 py-4",
  "sm:flex-row sm:items-center sm:justify-end",
  "[&_[data-slot=button]]:h-9 [&_[data-slot=button]]:px-4 [&_[data-slot=button]]:text-[13px] sm:[&_[data-slot=button]]:min-w-24",
  "[&_[data-variant=destructive]]:bg-destructive [&_[data-variant=destructive]]:text-white [&_[data-variant=destructive]:hover]:bg-destructive/90",
  "group-data-[variant=editorial]/dialog-surface:mx-0 group-data-[variant=editorial]/dialog-surface:mb-0",
  "group-data-[variant=editorial]/dialog-surface:mt-4 group-data-[variant=editorial]/dialog-surface:gap-3",
  "group-data-[variant=editorial]/dialog-surface:rounded-none group-data-[variant=editorial]/dialog-surface:border-0",
  "group-data-[variant=editorial]/dialog-surface:bg-transparent group-data-[variant=editorial]/dialog-surface:p-0",
  "group-data-[variant=editorial]/dialog-surface:[&_[data-slot=button]]:h-11 group-data-[variant=editorial]/dialog-surface:[&_[data-slot=button]]:rounded-none",
  "group-data-[variant=editorial]/dialog-surface:[&_[data-slot=button]]:px-7 group-data-[variant=editorial]/dialog-surface:[&_[data-slot=button]]:text-[11px]",
  "group-data-[variant=editorial]/dialog-surface:[&_[data-slot=button]]:tracking-[0.15em] group-data-[variant=editorial]/dialog-surface:[&_[data-slot=button]]:uppercase",
].join(" ")

export const DIALOG_CLOSE_CLASS = [
  "absolute top-4 right-4 text-muted-foreground hover:text-foreground pointer-coarse:size-10",
  "group-data-[variant=editorial]/dialog-surface:rounded-none sm:group-data-[variant=editorial]/dialog-surface:top-6 sm:group-data-[variant=editorial]/dialog-surface:right-6",
].join(" ")
