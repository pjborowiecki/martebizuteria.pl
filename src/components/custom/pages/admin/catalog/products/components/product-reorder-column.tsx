import { type createColumnHelper } from "@tanstack/react-table";

import { fixedDataGridColumnWidth } from "~/src/components/custom/datagrid/lib/data-grid.utils";
import { ProductReorderCell } from "~/src/components/custom/pages/admin/catalog/products/components/product-reorder-cell";

import { PRODUCT_TABLE_COLUMN_ID, PRODUCT_TABLE_COLUMN_SIZE } from "~/src/modules/product/product.constants";
import type { Product } from "~/src/modules/product/product.types";

export function createProductReorderColumn(helper: ReturnType<typeof createColumnHelper<Product["adminListItem"]>>) {
  return helper.display({
    cell: ({ row }) => <ProductReorderCell id={row.original.id} />,
    enableHiding: false,
    enableSorting: false,
    id: PRODUCT_TABLE_COLUMN_ID.drag,
    meta: {
      cellClassName: "px-1 text-center",
      headClassName: "px-1",
      preventRowClick: true,
      skeletonVariant: "icon"
    },
    ...fixedDataGridColumnWidth(PRODUCT_TABLE_COLUMN_SIZE.drag)
  });
}
