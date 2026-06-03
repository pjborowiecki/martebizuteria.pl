import type { RowData, Table } from "@tanstack/react-table";

/** Loading placeholder shape for a datagrid body cell (set per column in `meta`). */
export type DataGridSkeletonVariant = "badge" | "checkbox" | "date" | "icon" | "iconEnd" | "number" | "text" | "thumbnail" | "title";

/**
 * Per-column presentation hints honoured by the generic header/body cells.
 * Declared once here so every page that uses the datagrid shares the same meta.
 */
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    readonly cellClassName?: string;
    readonly headClassName?: string;
    /** Grows to fill space left of fixed utility columns when the table is wider than the column sum. */
    readonly fillsRemainingWidth?: boolean;
    /** Expands when the fill column is user-sized so the table still spans the container. */
    readonly absorbsTrailingSlack?: boolean;
    /** Clicks on this column do not fire `onRowClick`. */
    readonly preventRowClick?: boolean;
    readonly skeletonVariant?: DataGridSkeletonVariant;
  }
}

/** Direction a row moves when reordered via the keyboard. */
export type RowMoveDirection = "up" | "down";

/** Header drag-and-drop wiring for left/right column reordering. */
export interface ColumnReorderApi {
  readonly draggedColumnId: string | undefined;
  readonly onColumnDragEnd: () => void;
  readonly onColumnDragOver: (overId: string) => void;
  readonly onColumnDragStart: (id: string) => void;
}

/**
 * Optional row drag/keyboard reordering, supplied by pages that persist a manual
 * order (e.g. collection rank). When omitted, rows are not reorderable.
 */
export interface RowReorderApi {
  readonly draggingId: string | undefined;
  /** Reordering only makes sense in the natural order (no sort/filter/search). */
  readonly enabled: boolean;
  readonly onRowDragEnter: (overId: string) => void;
  readonly onRowDragStart: (id: string) => void;
  readonly onRowDrop: () => void;
  readonly onRowMove: (id: string, direction: RowMoveDirection) => void;
}

/**
 * Everything the datagrid chrome (toolbar, header, rows, pagination) needs,
 * exposed through a per-feature context so nothing has to be prop-drilled.
 */
export interface DataGridContextValue<TData extends RowData> {
  readonly columnReorder: ColumnReorderApi;
  /** Matches `createDataGrid` / localStorage key (drives CSS var column widths). */
  readonly persistenceKey: string;
  /** When set, clicking a row opens detail/edit unless the click target is interactive. */
  readonly onRowClick?: (row: TData) => void;
  readonly hasPreferenceOverrides: boolean;
  readonly isLoading: boolean;
  readonly resetPreferences: () => void;
  readonly rowReorder: RowReorderApi | undefined;
  readonly searchPlaceholder: string;
  readonly table: Table<TData>;
}
