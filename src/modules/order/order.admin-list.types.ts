import { type AdminOrdersListFilters } from "~/src/modules/order/order.admin-list-filters"
import { type AdminOrderStatFilter, type AdminOrderTab } from "~/src/modules/order/order.constants"

export interface AdminOrdersPageInput {
  readonly createdAt?: AdminOrdersListFilters["createdAt"] | undefined
  readonly fulfillment?: AdminOrdersListFilters["fulfillment"] | undefined
  readonly page?: number | undefined
  readonly pageSize?: number | undefined
  readonly payment?: AdminOrdersListFilters["payment"] | undefined
  readonly search?: string | undefined
  readonly statFilter?: AdminOrderStatFilter | undefined
  readonly status?: AdminOrdersListFilters["status"] | undefined
  readonly tab?: AdminOrderTab | undefined
  readonly total?: AdminOrdersListFilters["total"] | undefined
}

export type AdminOrdersExportInput = Omit<AdminOrdersPageInput, "page" | "pageSize">
