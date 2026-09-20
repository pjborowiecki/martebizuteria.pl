import { type Product } from "~/src/modules/product/product.types"

import { createDataGrid } from "~/src/presentation/components/custom/datagrid/components/create-data-grid"

export const PRODUCTS_DATA_GRID_KEY = "admin.catalog.products:v2"

export const productsDataGrid = createDataGrid<Product["adminListItem"]>({
  persistenceKey: PRODUCTS_DATA_GRID_KEY,
})
