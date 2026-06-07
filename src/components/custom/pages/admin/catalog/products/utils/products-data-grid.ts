import { createDataGrid } from "~/src/components/custom/datagrid/components/create-data-grid";

import type { Product } from "~/src/modules/product/product.types";

/** Bumped when default columns change (SKU + variant kind) so stale localStorage widths are dropped. */
export const PRODUCTS_DATA_GRID_KEY = "admin.catalog.products:v2";

export const productsDataGrid = createDataGrid<Product["adminListItem"]>({
  persistenceKey: PRODUCTS_DATA_GRID_KEY
});
