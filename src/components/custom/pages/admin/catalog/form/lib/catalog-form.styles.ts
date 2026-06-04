import { cn } from "~/src/lib/utils";

import {
  SHEET_CONTROL_HEIGHT,
  SHEET_CONTROL_RADIUS_CLASS,
  sheetInputClassName,
  sheetInputGroupClassName,
  sheetNumberInputNoSpinnerClassName,
  sheetSelectTriggerClassName
} from "~/src/components/shadcn/sheet-control.styles";

/** Outline actions beside 40px sheet inputs (add tag, add attribute, etc.). */
export const CATALOG_SHEET_ACTION_BUTTON_CLASS = cn(
  SHEET_CONTROL_HEIGHT,
  SHEET_CONTROL_RADIUS_CLASS,
  "min-w-[9.5rem] shrink-0 px-3 text-sm whitespace-nowrap"
);

/** @deprecated Prefer `<Input variant="sheet" />` — kept for extra className merges. */
export const CATALOG_SHEET_INPUT_CLASS = sheetInputClassName;

/** @deprecated Prefer `<InputGroup variant="sheet" />`. */
export const CATALOG_SHEET_INPUT_GROUP_CLASS = sheetInputGroupClassName;

/** @deprecated Prefer `<SelectTrigger size="sheet" />`. */
export const CATALOG_SHEET_SELECT_CLASS = sheetSelectTriggerClassName;

export const CATALOG_SHEET_TEXTAREA_CLASS = [
  "min-h-[104px] resize-none border border-border bg-background px-3 py-2.5 text-sm shadow-none focus-visible:border-foreground focus-visible:ring-0",
  SHEET_CONTROL_RADIUS_CLASS
].join(" ");

/** Taller min-height for long-form description fields in catalog sheets. */
export const CATALOG_FORM_DESCRIPTION_TEXTAREA_CLASS = "min-h-[168px]";

/** Read-only identifier fields in catalog sheets (edit mode). */
export const CATALOG_SHEET_READ_ONLY_INPUT_CLASS = [
  "h-10 min-h-10 max-h-10",
  "cursor-default border border-border bg-muted/30 px-3 py-0 font-mono text-sm leading-10 text-muted-foreground shadow-none focus-visible:ring-0",
  SHEET_CONTROL_RADIUS_CLASS
].join(" ");

/** Consistent vertical spacing between fields inside catalog sheet cards. */
export const CATALOG_SHEET_CARD_CONTENT_CLASS = "space-y-6";

/** Vertical field rhythm: fixed label row + 40px control slot (input, select, input-group). */
export const CATALOG_SHEET_FIELD_CLASS = [
  "gap-2",
  "[&_input]:h-10 [&_input]:min-h-10 [&_input]:max-h-10",
  "[&_[data-slot=input-group]]:h-10 [&_[data-slot=input-group]]:min-h-10 [&_[data-slot=input-group]]:max-h-10",
  "[&_[data-slot=select-trigger]]:h-10 [&_[data-slot=select-trigger]]:min-h-10 [&_[data-slot=select-trigger]]:max-h-10"
].join(" ");

/** Compact shadcn Input for dense in-grid editors (e.g. variant rows). */
export const CATALOG_SHEET_INLINE_INPUT_CLASS = [
  "h-8 min-h-8 max-h-8",
  "box-border border border-border bg-background px-2 py-0 text-sm leading-8 shadow-none focus-visible:border-foreground focus-visible:ring-0 disabled:bg-muted/40 dark:bg-background",
  SHEET_CONTROL_RADIUS_CLASS,
  sheetNumberInputNoSpinnerClassName
].join(" ");

export const CATALOG_SHEET_NUMBER_INPUT_CLASS = sheetNumberInputNoSpinnerClassName;
