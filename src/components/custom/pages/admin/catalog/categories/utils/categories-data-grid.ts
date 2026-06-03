import { createDataGrid } from "~/src/components/custom/datagrid/components/create-data-grid";

import type { Category } from "~/src/modules/category/category.types";

export const CATEGORIES_DATA_GRID_KEY = "admin.catalog.categories";

export const categoriesDataGrid = createDataGrid<Category["adminListItem"]>({
  persistenceKey: CATEGORIES_DATA_GRID_KEY
});
