import { type DeliveryMethod } from "~/src/modules/delivery-method/delivery-method.types"

import { createDataGrid } from "~/src/presentation/components/custom/datagrid/components/create-data-grid"

export const DELIVERY_METHODS_DATA_GRID_KEY = "admin.settings.delivery-methods:v1"

export const deliveryMethodsDataGrid = createDataGrid<DeliveryMethod["adminMethod"]>({
  persistenceKey: DELIVERY_METHODS_DATA_GRID_KEY,
})
