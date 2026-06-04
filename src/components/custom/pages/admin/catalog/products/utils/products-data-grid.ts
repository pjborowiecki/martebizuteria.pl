import { createDataGrid } from "~/src/components/custom/datagrid/components/create-data-grid";

import type { Product } from "~/src/modules/product/product.types";

export const PRODUCTS_DATA_GRID_KEY = "admin.catalog.products";

export const productsDataGrid = createDataGrid<Product["adminListItem"]>({
  persistenceKey: PRODUCTS_DATA_GRID_KEY
});
