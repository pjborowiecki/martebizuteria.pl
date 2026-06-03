import { cn } from "~/src/lib/utils";

/** Matches tallest body cell (title + handle) so skeleton and data rows share height. */
export const DATA_GRID_BODY_ROW_MIN_HEIGHT_CLASS = "min-h-14";

/** Body row chrome — `group` drives shared hover/selected backgrounds on every cell. */
export const DATA_GRID_BODY_ROW_CLASS = cn("group border-border/50 transition-colors", DATA_GRID_BODY_ROW_MIN_HEIGHT_CLASS);

/** Every body cell paints its own background so pinned columns match the row on hover. */
export const DATA_GRID_BODY_CELL_CLASS =
  "border-b border-border/60 bg-card transition-colors group-hover:bg-muted group-data-[state=selected]:bg-muted";

/** Empty-state cell shell (`<td>` min-height is ignored by table layout — height lives on the inner block). */
export const DATA_GRID_EMPTY_ROW_CELL_CLASS = "border-b border-border/60 bg-card p-0";

/** Empty-state content — block wrapper so min-height is honored inside the table. */
export const DATA_GRID_EMPTY_ROW_CONTENT_CLASS =
  "flex min-h-64 w-full items-center justify-center px-4 py-12 text-center text-sm text-muted-foreground";
