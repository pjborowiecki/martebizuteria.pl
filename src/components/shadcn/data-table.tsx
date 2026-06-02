import { type ComponentProps, type CSSProperties, forwardRef, type JSX } from "react";

import { cn } from "~/src/lib/utils";

/** Horizontal scroll wrapper for TanStack tables with explicit column widths. */
const DataTableContainer = forwardRef<HTMLDivElement, ComponentProps<"div">>(function DataTableContainer(
  { className, ...props },
  ref
): JSX.Element {
  return <div ref={ref} data-slot="data-table-container" className={cn("relative w-full min-w-0 overflow-x-auto", className)} {...props} />;
});

const UNMEASURED_CONTAINER_WIDTH = 0;

/**
 * Admin data tables: full card width, `table-layout: fixed`, explicit column widths via `<col>` + cells.
 * Avoid the default shadcn `Table` wrapper (`w-full` on a nested `<table>` without column control).
 */
function DataTable({ className, style, ...props }: ComponentProps<"table">): JSX.Element {
  return (
    <table
      data-slot="data-table"
      className={cn("min-w-0 table-fixed caption-bottom border-separate border-spacing-0 text-xs", className)}
      style={style}
      {...props}
    />
  );
}

interface DataTableContentStyleInput {
  readonly containerWidthPx: number;
  readonly layoutWidthPx: number;
  readonly minWidthPx: number;
}

/**
 * Fills the scroll container before it is measured (`width: 100%`); after measure, spans at
 * least the container and grows wider when columns need horizontal scroll.
 */
function dataTableContentStyle({ containerWidthPx, layoutWidthPx, minWidthPx }: DataTableContentStyleInput): CSSProperties {
  const contentWidth = Math.max(minWidthPx, layoutWidthPx);

  if (containerWidthPx <= UNMEASURED_CONTAINER_WIDTH) {
    return { minWidth: minWidthPx, width: "100%" };
  }

  return {
    minWidth: minWidthPx,
    width: `${Math.max(contentWidth, containerWidthPx)}px`
  };
}

export { DataTable, DataTableContainer, dataTableContentStyle };
