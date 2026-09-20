import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

import { createDataGrid } from "~/src/presentation/components/custom/datagrid/components/create-data-grid"

export const ATTRIBUTES_DATA_GRID_KEY = "admin.catalog.attributes:v6"

export const attributesDataGrid = createDataGrid<ProductAttribute["adminListItem"]>({
  persistenceKey: ATTRIBUTES_DATA_GRID_KEY,
})
