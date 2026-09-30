import { type RowData, type Table } from "@tanstack/react-table"

import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

export type DataGridSkeletonVariant =
  | "badge"
  | "checkbox"
  | "date"
  | "icon"
  | "iconEnd"
  | "number"
  | "recordId"
  | "text"
  | "thumbnail"
  | "title"

export interface DataGridColumnMeta {
  readonly cellClassName?: string
  readonly headClassName?: string
  readonly fillsRemainingWidth?: boolean
  readonly absorbsTrailingSlack?: boolean
  readonly filterOnly?: boolean
  readonly preventRowClick?: boolean
  readonly skeletonVariant?: DataGridSkeletonVariant
}

export type RowMoveDirection = "up" | "down"

export interface ColumnReorderApi {
  readonly draggedColumnId: string | undefined
  readonly onColumnDragEnd: () => void
  readonly onColumnDragOver: (overId: string) => void
  readonly onColumnDragStart: (id: string) => void
}

export interface RowReorderApi {
  readonly draggingId: string | undefined
  readonly enabled: boolean
  readonly onRowDragEnter: (overId: string) => void
  readonly onRowDragStart: (id: string) => void
  readonly onRowDrop: () => void
  readonly onRowMove: (id: string, direction: RowMoveDirection) => void
}

export interface DataGridContextValue<TData extends RowData> {
  readonly columnReorder: ColumnReorderApi
  readonly persistenceKey: string
  readonly onRowClick?: ((row: TData) => void) | undefined
  readonly onRowPointerEnter?: ((row: TData) => void) | undefined
  readonly hasPreferenceOverrides: boolean
  readonly isLoading: boolean
  readonly resetPreferences: () => void
  readonly rowReorder: RowReorderApi | undefined
  readonly searchPlaceholder: string
  readonly table: Table<DataGridFeatures, TData>
}
