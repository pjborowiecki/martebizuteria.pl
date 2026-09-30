import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

import { createDataGrid } from "~/src/presentation/components/custom/datagrid/components/create-data-grid"

export const CATEGORIES_DATA_GRID_KEY = "admin.catalog.categories"

export const categoriesDataGrid = createDataGrid<ProductCategory["adminListItem"]>({
  persistenceKey: CATEGORIES_DATA_GRID_KEY,
})
