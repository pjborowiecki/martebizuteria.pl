import { type ColumnFiltersState } from "@tanstack/react-table"

import { ROLES } from "~/src/integrations/better-auth/auth.constants"

import { ADMIN_CUSTOMER_TABLE_COLUMN_ID } from "~/src/modules/user/user.constants"

import {
  type DateColumnFilterValue,
  type NumericColumnFilterValue,
  isDateColumnFilterValue,
  isNumericColumnFilterValue,
} from "~/src/lib/admin-column-filters"
const isAdminCustomerRole = (value: string): value is (typeof ROLES)[keyof typeof ROLES] =>
  value === ROLES.ADMIN || value === ROLES.CUSTOMER

export const parseAdminCustomersListFilters = (columnFilters: ColumnFiltersState): AdminCustomersListFilters =>
  columnFilters.reduce<AdminCustomersListFilters>((filters, { id, value }) => {
    const handler = ADMIN_CUSTOMER_COLUMN_FILTER_HANDLERS[id]
    return handler === undefined ? filters : handler(filters, value)
  }, {})

export const adminCustomersListFiltersNeedOrderRollup = (filters: AdminCustomersListFilters): boolean =>
  filters.totalSpent !== undefined || filters.averageOrderValue !== undefined || filters.lastOrderAt !== undefined

export interface AdminCustomersListFilters {
  readonly averageOrderValue?: NumericColumnFilterValue | undefined
  readonly banned?: boolean | undefined
  readonly createdAt?: DateColumnFilterValue | undefined
  readonly emailVerified?: boolean | undefined
  readonly lastOrderAt?: DateColumnFilterValue | undefined
  readonly role?: (typeof ROLES)[keyof typeof ROLES] | undefined
  readonly totalSpent?: NumericColumnFilterValue | undefined
}
type AdminCustomerColumnFilterHandler = (filters: AdminCustomersListFilters, value: unknown) => AdminCustomersListFilters
const applyRoleFilter: AdminCustomerColumnFilterHandler = (filters, value) =>
  typeof value === "string" && isAdminCustomerRole(value)
    ? {
        ...filters,
        role: value,
      }
    : filters
const applyEmailVerifiedFilter: AdminCustomerColumnFilterHandler = (filters, value) =>
  typeof value === "boolean"
    ? {
        ...filters,
        emailVerified: value,
      }
    : filters
const applyBannedFilter: AdminCustomerColumnFilterHandler = (filters, value) =>
  typeof value === "boolean"
    ? {
        ...filters,
        banned: value,
      }
    : filters
const applyTotalSpentFilter: AdminCustomerColumnFilterHandler = (filters, value) =>
  isNumericColumnFilterValue(value)
    ? {
        ...filters,
        totalSpent: value,
      }
    : filters
const applyAverageOrderValueFilter: AdminCustomerColumnFilterHandler = (filters, value) =>
  isNumericColumnFilterValue(value)
    ? {
        ...filters,
        averageOrderValue: value,
      }
    : filters
const applyLastOrderAtFilter: AdminCustomerColumnFilterHandler = (filters, value) =>
  isDateColumnFilterValue(value)
    ? {
        ...filters,
        lastOrderAt: value,
      }
    : filters
const applyCreatedAtFilter: AdminCustomerColumnFilterHandler = (filters, value) =>
  isDateColumnFilterValue(value)
    ? {
        ...filters,
        createdAt: value,
      }
    : filters
const ADMIN_CUSTOMER_COLUMN_FILTER_HANDLERS: Partial<Record<string, AdminCustomerColumnFilterHandler>> = {
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.averageOrderValue]: applyAverageOrderValueFilter,
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.banned]: applyBannedFilter,
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.createdAt]: applyCreatedAtFilter,
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.emailVerified]: applyEmailVerifiedFilter,
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.lastOrderAt]: applyLastOrderAtFilter,
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.role]: applyRoleFilter,
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.totalSpent]: applyTotalSpentFilter,
}
