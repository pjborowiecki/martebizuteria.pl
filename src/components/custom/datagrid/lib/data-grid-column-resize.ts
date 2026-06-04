import type { Column, ColumnSizingState, Header, RowData, Table } from "@tanstack/react-table";

import { idleColumnSizingInfo } from "~/src/components/custom/datagrid/lib/data-grid-column-sizing-info";
import { getDataGridLayoutColumnWidth } from "~/src/components/custom/datagrid/lib/data-grid-column-widths";
import {
  columnFillsRemainingWidth,
  columnFillUsesFlexWidth,
  readColumnDesignWidth,
  resolveDataGridTableLayout
} from "~/src/components/custom/datagrid/lib/data-grid-table-layout";
import { getDataGridLayoutColumns, measureDataGridContainerWidth } from "~/src/components/custom/datagrid/lib/data-grid.utils";

const RESIZE_DIRECTION_LTR = 1;
const RESIZE_DIRECTION_RTL = -1;
const DEFAULT_MIN_COLUMN_SIZE = 20;
const SIZE_ROUND_FACTOR = 100;
const NO_DELTA = 0;
const SINGLE_TOUCH = 1;
const FIRST_TOUCH_INDEX = 0;
const NO_CLIENT_X = 0;

type ResizeEvent = MouseEvent | TouchEvent;

interface ResizePointerBindings {
  readonly event: ResizeEvent;
  readonly onEnd: (clientX: number) => void;
  readonly onMove: (clientX: number) => void;
  readonly startOffset: number;
}

interface ColumnResizeSession<TData extends RowData> {
  readonly column: Column<TData>;
  readonly startOffset: number;
  readonly startWidth: number;
  readonly table: Table<TData>;
}

function isTouchStartEvent(event: ResizeEvent): event is TouchEvent {
  return event.type === "touchstart";
}

function measureHeaderCellWidth(event: ResizeEvent): number | undefined {
  const { target } = event;
  if (!(target instanceof Element)) {
    return undefined;
  }
  const cell = target.closest("th");
  const width = cell instanceof HTMLTableCellElement ? cell.offsetWidth : undefined;
  return typeof width === "number" && width > DEFAULT_MIN_COLUMN_SIZE ? width : undefined;
}

function isResizePointerEvent(value: unknown): value is ResizeEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const type = "type" in value && typeof value.type === "string" ? value.type : "";
  return type === "mousedown" || type === "touchstart";
}

function getClientX(event: ResizeEvent): number {
  if (isTouchStartEvent(event)) {
    return Math.round(event.touches[FIRST_TOUCH_INDEX]?.clientX ?? NO_CLIENT_X);
  }
  return event.clientX;
}

function clampColumnWidth(width: number, minSize: number, maxSize: number): number {
  return Math.round(Math.max(Math.min(width, maxSize), minSize) * SIZE_ROUND_FACTOR) / SIZE_ROUND_FACTOR;
}

function bindResizePointerListeners(bindings: ResizePointerBindings): void {
  const { event, onEnd, onMove, startOffset } = bindings;
  const doc = globalThis.document;
  const passive = { passive: false };

  const mouseEvents = {
    moveHandler: (moveEvent: MouseEvent) => {
      onMove(moveEvent.clientX);
    },
    upHandler: (upEvent: MouseEvent) => {
      doc.removeEventListener("mousemove", mouseEvents.moveHandler);
      doc.removeEventListener("mouseup", mouseEvents.upHandler);
      onEnd(upEvent.clientX);
    }
  };

  const touchEvents = {
    moveHandler: (moveEvent: TouchEvent) => {
      if (moveEvent.cancelable) {
        moveEvent.preventDefault();
        moveEvent.stopPropagation();
      }
      onMove(moveEvent.touches[FIRST_TOUCH_INDEX]?.clientX ?? startOffset);
    },
    upHandler: (upEvent: TouchEvent) => {
      doc.removeEventListener("touchmove", touchEvents.moveHandler);
      doc.removeEventListener("touchend", touchEvents.upHandler);
      if (upEvent.cancelable) {
        upEvent.preventDefault();
        upEvent.stopPropagation();
      }
      onEnd(upEvent.touches[FIRST_TOUCH_INDEX]?.clientX ?? startOffset);
    }
  };

  if (isTouchStartEvent(event)) {
    doc.addEventListener("touchmove", touchEvents.moveHandler, passive);
    doc.addEventListener("touchend", touchEvents.upHandler, passive);
  } else {
    doc.addEventListener("mousemove", mouseEvents.moveHandler, passive);
    doc.addEventListener("mouseup", mouseEvents.upHandler, passive);
  }
}

function startColumnResize<TData extends RowData>(session: ColumnResizeSession<TData>): void {
  const { column, startOffset, startWidth, table } = session;
  table.setColumnSizingInfo((info) => ({
    ...info,
    columnSizingStart: [[column.id, startWidth]],
    deltaOffset: NO_DELTA,
    deltaPercentage: NO_DELTA,
    isResizingColumn: column.id,
    startOffset,
    startSize: startWidth
  }));
}

function readFillColumnMinSize<TData extends RowData>(column: Column<TData>, table: Table<TData>): number {
  return column.columnDef.minSize ?? table.options.defaultColumn?.minSize ?? DEFAULT_MIN_COLUMN_SIZE;
}

function persistColumnWidth<TData extends RowData>(input: {
  readonly column: Column<TData>;
  readonly table: Table<TData>;
  readonly width: number;
}): void {
  const { column, table, width } = input;
  const minSize = readFillColumnMinSize(column, table);
  const finalWidth = clampColumnWidth(
    width,
    minSize,
    column.columnDef.maxSize ?? table.options.defaultColumn?.maxSize ?? Number.MAX_SAFE_INTEGER
  );

  table.setColumnSizing((current) => ({ ...current, [column.id]: finalWidth }));
}

interface ColumnResizeContext<TData extends RowData> {
  readonly column: Column<TData>;
  readonly direction: number;
  readonly isFillColumn: boolean;
  readonly minSize: number;
  readonly startOffset: number;
  readonly startWidth: number;
  readonly table: Table<TData>;
}

function beginColumnResizeContext<TData extends RowData>(header: Header<TData, unknown>, event: ResizeEvent): ColumnResizeContext<TData> {
  const { column } = header;
  const { table } = header.getContext();
  const containerWidth = measureDataGridContainerWidth(event);
  const columns = getDataGridLayoutColumns(table);
  const { columnSizing } = table.getState();
  const isFillColumn = columnFillsRemainingWidth(column);
  const minSize = readFillColumnMinSize(column, table);
  const measuredWidth = isFillColumn ? measureHeaderCellWidth(event) : undefined;
  const usesFlexFill = columnFillUsesFlexWidth({ column, columnSizing });
  const layout = resolveDataGridTableLayout({ columnSizing, columns, tableClientWidth: containerWidth });
  const layoutWidth = getDataGridLayoutColumnWidth(column, columnSizing);
  const startWidth = usesFlexFill
    ? (measuredWidth ?? layout?.fillColumnWidth ?? readColumnDesignWidth(column))
    : (measuredWidth ?? layoutWidth);
  const direction = table.options.columnResizeDirection === "rtl" ? RESIZE_DIRECTION_RTL : RESIZE_DIRECTION_LTR;

  if (isFillColumn && usesFlexFill) {
    table.setColumnSizing((current) => ({ ...current, [column.id]: startWidth }));
  }

  return {
    column,
    direction,
    isFillColumn,
    minSize,
    startOffset: getClientX(event),
    startWidth,
    table
  };
}

function applyStandardColumnResize<TData extends RowData>(
  context: ColumnResizeContext<TData>,
  nextWidth: number,
  mode: "move" | "end"
): void {
  const { column, minSize, table } = context;
  const patch: ColumnSizingState = {
    [column.id]: clampColumnWidth(
      nextWidth,
      minSize,
      column.columnDef.maxSize ?? table.options.defaultColumn?.maxSize ?? Number.MAX_SAFE_INTEGER
    )
  };

  if (table.options.columnResizeMode === "onChange" || mode === "end") {
    table.setColumnSizing((current) => ({ ...current, ...patch }));
  }
}

function applyColumnResizeSize<TData extends RowData>(context: ColumnResizeContext<TData>, clientX: number, mode: "move" | "end"): void {
  const { column, direction, isFillColumn, startOffset, startWidth, table } = context;
  const nextWidth = startWidth + (clientX - startOffset) * direction;

  if (isFillColumn) {
    if (table.options.columnResizeMode === "onChange" || mode === "end") {
      persistColumnWidth({ column, table, width: nextWidth });
    }
    return;
  }

  applyStandardColumnResize(context, nextWidth, mode);
}

/** Resize handler scoped to the active column only (TanStack default can scale every leaf header). */
export function createDataGridColumnResizeHandler<TData extends RowData>(header: Header<TData, unknown>): (event: unknown) => void {
  const { table } = header.getContext();

  return (rawEvent: unknown) => {
    if (!header.column.getCanResize() || !isResizePointerEvent(rawEvent)) {
      return;
    }

    const event = rawEvent;
    if (isTouchStartEvent(event) && event.touches.length > SINGLE_TOUCH) {
      return;
    }

    const context = beginColumnResizeContext(header, event);

    const onEnd = (clientX: number) => {
      applyColumnResizeSize(context, clientX, "end");
      table.setColumnSizingInfo(idleColumnSizingInfo);
    };

    bindResizePointerListeners({
      event,
      onEnd,
      onMove: (clientX) => {
        applyColumnResizeSize(context, clientX, "move");
      },
      startOffset: context.startOffset
    });
    startColumnResize({ column: context.column, startOffset: context.startOffset, startWidth: context.startWidth, table });
  };
}
