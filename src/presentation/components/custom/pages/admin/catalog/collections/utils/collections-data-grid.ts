import { type Collection } from "~/src/modules/product-collection/product-collection.types"

import { createDataGrid } from "~/src/presentation/components/custom/datagrid/components/create-data-grid"

export const COLLECTIONS_DATA_GRID_KEY = "admin.catalog.collections"

export const collectionsDataGrid = createDataGrid<Collection["adminListItem"]>({
  persistenceKey: COLLECTIONS_DATA_GRID_KEY,
})
