import { type ColumnFiltersState } from "@tanstack/react-table"

import {
  type DateColumnFilterValue,
  type NumericColumnFilterValue,
  isDateColumnFilterValue,
  isNumericColumnFilterValue,
} from "~/src/modules/_core/utils/column-filters"
import { PRODUCT_TABLE_COLUMN_ID } from "~/src/modules/product/product.constants"

export interface AdminProductsListColumnFilters {
  readonly createdAt?: DateColumnFilterValue
  readonly minPrice?: NumericColumnFilterValue
  readonly totalStock?: NumericColumnFilterValue
}

type AdminProductsColumnFilterHandler = (filters: AdminProductsListColumnFilters, value: unknown) => AdminProductsListColumnFilters

const applyMinPriceFilter: AdminProductsColumnFilterHandler = (filters, value) =>
  isNumericColumnFilterValue(value)
    ? {
        ...filters,
        minPrice: value,
      }
    : filters

const applyTotalStockFilter: AdminProductsColumnFilterHandler = (filters, value) =>
  isNumericColumnFilterValue(value)
    ? {
        ...filters,
        totalStock: value,
      }
    : filters

const applyCreatedAtFilter: AdminProductsColumnFilterHandler = (filters, value) =>
  isDateColumnFilterValue(value)
    ? {
        ...filters,
        createdAt: value,
      }
    : filters

const ADMIN_PRODUCTS_COLUMN_FILTER_HANDLERS: Partial<Record<string, AdminProductsColumnFilterHandler>> = {
  [PRODUCT_TABLE_COLUMN_ID.createdAt]: applyCreatedAtFilter,
  [PRODUCT_TABLE_COLUMN_ID.minPrice]: applyMinPriceFilter,
  [PRODUCT_TABLE_COLUMN_ID.stock]: applyTotalStockFilter,
}

export const hasAdminProductsListColumnFilters = (columnFilters: AdminProductsListColumnFilters): boolean =>
  columnFilters.minPrice !== undefined || columnFilters.totalStock !== undefined || columnFilters.createdAt !== undefined

export const parseAdminProductsListColumnFilters = (columnFilters: ColumnFiltersState): AdminProductsListColumnFilters =>
  columnFilters.reduce<AdminProductsListColumnFilters>((filters, { id, value }) => {
    const handler = ADMIN_PRODUCTS_COLUMN_FILTER_HANDLERS[id]

    return handler === undefined ? filters : handler(filters, value)
  }, {})
