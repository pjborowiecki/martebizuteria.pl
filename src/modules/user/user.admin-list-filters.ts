import type { ColumnFiltersState } from "@tanstack/react-table";

import { ROLES } from "~/src/constants/_constants/permissions";

import {
  isDateColumnFilterValue,
  isNumericColumnFilterValue,
  type DateColumnFilterValue,
  type NumericColumnFilterValue
} from "~/src/lib/_utils/admin-column-filters";

import { ADMIN_CUSTOMER_TABLE_COLUMN_ID } from "~/src/modules/user/user.constants";

export interface AdminCustomersListFilters {
  readonly averageOrderValue?: NumericColumnFilterValue;
  readonly banned?: boolean;
  readonly createdAt?: DateColumnFilterValue;
  readonly emailVerified?: boolean;
  readonly lastOrderAt?: DateColumnFilterValue;
  readonly role?: (typeof ROLES)[keyof typeof ROLES];
  readonly totalSpent?: NumericColumnFilterValue;
}

function isAdminCustomerRole(value: string): value is (typeof ROLES)[keyof typeof ROLES] {
  return value === ROLES.ADMIN || value === ROLES.CUSTOMER;
}

type AdminCustomerColumnFilterHandler = (filters: AdminCustomersListFilters, value: unknown) => AdminCustomersListFilters;

const applyRoleFilter: AdminCustomerColumnFilterHandler = (filters, value) =>
  typeof value === "string" && isAdminCustomerRole(value) ? { ...filters, role: value } : filters;

const applyEmailVerifiedFilter: AdminCustomerColumnFilterHandler = (filters, value) =>
  typeof value === "boolean" ? { ...filters, emailVerified: value } : filters;

const applyBannedFilter: AdminCustomerColumnFilterHandler = (filters, value) =>
  typeof value === "boolean" ? { ...filters, banned: value } : filters;

const applyTotalSpentFilter: AdminCustomerColumnFilterHandler = (filters, value) =>
  isNumericColumnFilterValue(value) ? { ...filters, totalSpent: value } : filters;

const applyAverageOrderValueFilter: AdminCustomerColumnFilterHandler = (filters, value) =>
  isNumericColumnFilterValue(value) ? { ...filters, averageOrderValue: value } : filters;

const applyLastOrderAtFilter: AdminCustomerColumnFilterHandler = (filters, value) =>
  isDateColumnFilterValue(value) ? { ...filters, lastOrderAt: value } : filters;

const applyCreatedAtFilter: AdminCustomerColumnFilterHandler = (filters, value) =>
  isDateColumnFilterValue(value) ? { ...filters, createdAt: value } : filters;

const ADMIN_CUSTOMER_COLUMN_FILTER_HANDLERS: Partial<Record<string, AdminCustomerColumnFilterHandler>> = {
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.averageOrderValue]: applyAverageOrderValueFilter,
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.banned]: applyBannedFilter,
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.createdAt]: applyCreatedAtFilter,
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.emailVerified]: applyEmailVerifiedFilter,
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.lastOrderAt]: applyLastOrderAtFilter,
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.role]: applyRoleFilter,
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.totalSpent]: applyTotalSpentFilter
};

export function parseAdminCustomersListFilters(columnFilters: ColumnFiltersState): AdminCustomersListFilters {
  return columnFilters.reduce<AdminCustomersListFilters>((filters, { id, value }) => {
    const handler = ADMIN_CUSTOMER_COLUMN_FILTER_HANDLERS[id];
    return handler === undefined ? filters : handler(filters, value);
  }, {});
}

export function adminCustomersListFiltersNeedOrderRollup(filters: AdminCustomersListFilters): boolean {
  return filters.totalSpent !== undefined || filters.averageOrderValue !== undefined || filters.lastOrderAt !== undefined;
}
