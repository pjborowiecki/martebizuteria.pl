import { ADMIN_CUSTOMER_STRIPE_CUSTOMER_ID_COLUMN_WIDTH_PX } from "~/src/modules/user/user.constants"

import { fixedDataGridColumnWidth } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"

export const CUSTOMER_STRIPE_CUSTOMER_ID_COLUMN_META = {
  cellClassName: "overflow-hidden",
  headClassName: "overflow-hidden",
  skeletonVariant: "recordId",
} as const

export const customerStripeCustomerIdColumnWidth = () => fixedDataGridColumnWidth(ADMIN_CUSTOMER_STRIPE_CUSTOMER_ID_COLUMN_WIDTH_PX)
