import { fixedDataGridColumnWidth } from "~/src/components/custom/datagrid/lib/data-grid.utils";
import { CATALOG_ADMIN_RECORD_ID_COLUMN_WIDTH_PX } from "~/src/components/custom/pages/admin/catalog/lib/catalog-admin-datagrid.constants";

/** Shared meta for optional catalog `recordId` columns (UUID). */
export const CATALOG_RECORD_ID_COLUMN_META = {
  cellClassName: "overflow-hidden",
  headClassName: "overflow-hidden",
  skeletonVariant: "recordId"
} as const;

/** Fixed width so every catalog table shows a full UUID (not user-resizable). */
export const catalogRecordIdColumnWidth = () => fixedDataGridColumnWidth(CATALOG_ADMIN_RECORD_ID_COLUMN_WIDTH_PX);
