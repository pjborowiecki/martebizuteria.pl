import { createDataGrid } from "~/src/components/custom/datagrid/components/create-data-grid";

import type { Collection } from "~/src/modules/collection/collection.types";

export const COLLECTIONS_DATA_GRID_KEY = "admin.catalog.collections";

export const collectionsDataGrid = createDataGrid<Collection["adminListItem"]>({
  persistenceKey: COLLECTIONS_DATA_GRID_KEY
});
