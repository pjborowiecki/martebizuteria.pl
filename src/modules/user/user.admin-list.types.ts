import { type AdminCustomersListFilters } from "~/src/modules/user/user.admin-list-filters"
import { type AdminCustomerStatFilter } from "~/src/modules/user/user.constants"

export interface AdminCustomersPageInput {
  readonly averageOrderValue?: AdminCustomersListFilters["averageOrderValue"] | undefined
  readonly banned?: AdminCustomersListFilters["banned"] | undefined
  readonly createdAt?: AdminCustomersListFilters["createdAt"] | undefined
  readonly emailVerified?: AdminCustomersListFilters["emailVerified"] | undefined
  readonly lastOrderAt?: AdminCustomersListFilters["lastOrderAt"] | undefined
  readonly page?: number | undefined
  readonly pageSize?: number | undefined
  readonly role?: AdminCustomersListFilters["role"] | undefined
  readonly search?: string | undefined
  readonly statFilter?: AdminCustomerStatFilter | undefined
  readonly totalSpent?: AdminCustomersListFilters["totalSpent"] | undefined
}

export interface AdminCustomersExportInput {
  readonly averageOrderValue?: AdminCustomersListFilters["averageOrderValue"] | undefined
  readonly banned?: AdminCustomersListFilters["banned"] | undefined
  readonly createdAt?: AdminCustomersListFilters["createdAt"] | undefined
  readonly emailVerified?: AdminCustomersListFilters["emailVerified"] | undefined
  readonly lastOrderAt?: AdminCustomersListFilters["lastOrderAt"] | undefined
  readonly role?: AdminCustomersListFilters["role"] | undefined
  readonly search?: string | undefined
  readonly statFilter?: AdminCustomerStatFilter | undefined
  readonly totalSpent?: AdminCustomersListFilters["totalSpent"] | undefined
}
