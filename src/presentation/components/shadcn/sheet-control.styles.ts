export const SHEET_CONTROL_HEIGHT = "h-10 min-h-10 max-h-10"

export const SHEET_CONTROL_RADIUS_CLASS = "rounded-lg"

export const sheetNumberInputNoSpinnerClassName = [
  "[appearance:textfield]",
  "[&::-webkit-inner-spin-button]:appearance-none",
  "[&::-webkit-outer-spin-button]:appearance-none",
].join(" ")

export const sheetInputClassName = [
  SHEET_CONTROL_HEIGHT,
  SHEET_CONTROL_RADIUS_CLASS,
  "box-border w-full min-w-0 border border-border bg-background px-3 py-0 text-sm leading-10 shadow-none",
  "placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-0",
  "disabled:bg-muted/40 disabled:opacity-60 dark:bg-background dark:focus-visible:border-foreground",
].join(" ")

export const sheetInputGroupClassName = [
  SHEET_CONTROL_HEIGHT,
  SHEET_CONTROL_RADIUS_CLASS,
  "box-border flex w-full min-w-0 items-stretch overflow-hidden border border-border bg-background shadow-none",
  "focus-within:border-foreground focus-within:ring-0 has-disabled:bg-muted/40 dark:bg-background",
].join(" ")

export const sheetInputGroupInputClassName = [
  "h-full min-h-0 flex-1 rounded-none border-0 bg-transparent px-3 py-0 text-sm leading-10 shadow-none",
  "focus-visible:border-0 focus-visible:ring-0 disabled:bg-transparent dark:bg-transparent",
].join(" ")

export const sheetSelectTriggerClassName = [
  SHEET_CONTROL_HEIGHT,
  SHEET_CONTROL_RADIUS_CLASS,
  "box-border flex w-full min-w-0 items-center border border-border bg-background px-3 py-0 text-sm leading-10 shadow-none ring-0",
  "focus-visible:border-foreground focus-visible:ring-0 data-[state=open]:border-foreground",
  "data-placeholder:text-muted-foreground disabled:opacity-50 dark:bg-background",
  "[&_[data-slot=select-value]]:leading-10 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:opacity-50",
].join(" ")
