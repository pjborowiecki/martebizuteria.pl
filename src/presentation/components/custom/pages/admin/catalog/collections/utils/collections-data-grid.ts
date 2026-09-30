import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"

import { createDataGrid } from "~/src/presentation/components/custom/datagrid/components/create-data-grid"

export const COLLECTIONS_DATA_GRID_KEY = "admin.catalog.collections"

export const collectionsDataGrid = createDataGrid<ProductCollection["adminListItem"]>({
  persistenceKey: COLLECTIONS_DATA_GRID_KEY,
})
