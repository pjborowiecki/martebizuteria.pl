import { createDataGrid } from "~/src/components/custom/datagrid/components/create-data-grid";

import type { ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types";

/** Bumped when route namespace moved from properties to attributes. */
export const ATTRIBUTES_DATA_GRID_KEY = "admin.catalog.attributes:v6";

export const attributesDataGrid = createDataGrid<ProductAttribute["adminListItem"]>({
  persistenceKey: ATTRIBUTES_DATA_GRID_KEY
});
