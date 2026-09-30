import { type ColumnFiltersState } from "@tanstack/react-table"

import { isDateColumnFilterValue, isNumericColumnFilterValue } from "~/src/modules/_core/utils/column-filters"
import {
  ADMIN_ORDER_TABLE_COLUMN_ID,
  isAdminOrderFulfillmentUiKey,
  isAdminOrderPaymentUiKey,
  isAdminOrderStatus,
} from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

export const parseAdminOrdersListFilters = (columnFilters: ColumnFiltersState): Order["adminListFilters"] =>
  columnFilters.reduce<Order["adminListFilters"]>((filters, { id, value }) => {
    const handler = ADMIN_ORDER_COLUMN_FILTER_HANDLERS[id]

    return handler === undefined ? filters : handler(filters, value)
  }, {})

type AdminOrderColumnFilterHandler = (filters: Order["adminListFilters"], value: unknown) => Order["adminListFilters"]

const applyStatusFilter: AdminOrderColumnFilterHandler = (filters, value) =>
  typeof value === "string" && isAdminOrderStatus(value)
    ? {
        ...filters,
        status: value,
      }
    : filters

const applyPaymentFilter: AdminOrderColumnFilterHandler = (filters, value) =>
  typeof value === "string" && isAdminOrderPaymentUiKey(value)
    ? {
        ...filters,
        payment: value,
      }
    : filters

const applyFulfillmentFilter: AdminOrderColumnFilterHandler = (filters, value) =>
  typeof value === "string" && isAdminOrderFulfillmentUiKey(value)
    ? {
        ...filters,
        fulfillment: value,
      }
    : filters

const applyTotalFilter: AdminOrderColumnFilterHandler = (filters, value) =>
  isNumericColumnFilterValue(value)
    ? {
        ...filters,
        total: value,
      }
    : filters

const applyCreatedAtFilter: AdminOrderColumnFilterHandler = (filters, value) =>
  isDateColumnFilterValue(value)
    ? {
        ...filters,
        createdAt: value,
      }
    : filters

const ADMIN_ORDER_COLUMN_FILTER_HANDLERS: Partial<Record<string, AdminOrderColumnFilterHandler>> = {
  [ADMIN_ORDER_TABLE_COLUMN_ID.createdAt]: applyCreatedAtFilter,
  [ADMIN_ORDER_TABLE_COLUMN_ID.fulfillment]: applyFulfillmentFilter,
  [ADMIN_ORDER_TABLE_COLUMN_ID.payment]: applyPaymentFilter,
  [ADMIN_ORDER_TABLE_COLUMN_ID.status]: applyStatusFilter,
  [ADMIN_ORDER_TABLE_COLUMN_ID.total]: applyTotalFilter,
}
