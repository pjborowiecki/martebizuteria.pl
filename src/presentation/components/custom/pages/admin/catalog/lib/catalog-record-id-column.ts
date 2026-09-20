import { fixedDataGridColumnWidth } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { CATALOG_ADMIN_RECORD_ID_COLUMN_WIDTH_PX } from "~/src/presentation/components/custom/pages/admin/catalog/lib/catalog-admin-datagrid.constants"

export const CATALOG_RECORD_ID_COLUMN_META = {
  cellClassName: "overflow-hidden",
  headClassName: "overflow-hidden",
  skeletonVariant: "recordId",
} as const

export const catalogRecordIdColumnWidth = () => fixedDataGridColumnWidth(CATALOG_ADMIN_RECORD_ID_COLUMN_WIDTH_PX)
