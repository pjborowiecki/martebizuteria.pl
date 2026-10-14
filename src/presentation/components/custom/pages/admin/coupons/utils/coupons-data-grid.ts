import { type Discount } from "~/src/modules/discount/discount.types"

import { createDataGrid } from "~/src/presentation/components/custom/datagrid/components/create-data-grid"

export const COUPONS_DATA_GRID_KEY = "admin.coupons"

export const couponsDataGrid = createDataGrid<Discount["adminListItem"]>({
  persistenceKey: COUPONS_DATA_GRID_KEY,
})
