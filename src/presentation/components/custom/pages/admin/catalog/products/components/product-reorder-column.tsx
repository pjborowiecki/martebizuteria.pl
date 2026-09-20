import { type createColumnHelper } from "@tanstack/react-table"

import { PRODUCT_TABLE_COLUMN_ID, PRODUCT_TABLE_COLUMN_SIZE } from "~/src/modules/product/product.constants"
import { type Product } from "~/src/modules/product/product.types"

import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { fixedDataGridColumnWidth } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { ProductReorderCell } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/product-reorder-cell"
export const createProductReorderColumn = (helper: ReturnType<typeof createColumnHelper<DataGridFeatures, Product["adminListItem"]>>) =>
  helper.display({
    cell: ({ row }) => <ProductReorderCell id={row.original.id} />,
    enableHiding: false,
    enableSorting: false,
    id: PRODUCT_TABLE_COLUMN_ID.drag,
    meta: {
      cellClassName: "px-1 text-center",
      headClassName: "px-1",
      preventRowClick: true,
      skeletonVariant: "icon",
    },
    ...fixedDataGridColumnWidth(PRODUCT_TABLE_COLUMN_SIZE.drag),
  })
