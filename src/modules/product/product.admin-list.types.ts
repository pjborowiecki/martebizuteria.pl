import { type AdminProductsListSort } from "~/src/modules/product/product.admin-list-sort"
import { type ProductInventoryLevel, type ProductStatus, type ProductVariantKind } from "~/src/modules/product/product.constants"

import { type DateColumnFilterValue, type NumericColumnFilterValue } from "~/src/lib/admin-column-filters"

export interface AdminProductsPageInput {
  readonly categoryId?: string | undefined
  readonly collectionId?: string | undefined
  readonly createdAt?: DateColumnFilterValue | undefined
  readonly inventoryLevel?: ProductInventoryLevel | undefined
  readonly minPrice?: NumericColumnFilterValue | undefined
  readonly page?: number | undefined
  readonly pageSize?: number | undefined
  readonly search?: string | undefined
  readonly sort?: AdminProductsListSort | undefined
  readonly status?: ProductStatus | undefined
  readonly totalStock?: NumericColumnFilterValue | undefined
  readonly variantKind?: ProductVariantKind | undefined
}

export interface AdminProductsExportInput {
  readonly categoryId?: string | undefined
  readonly collectionId?: string | undefined
  readonly createdAt?: DateColumnFilterValue | undefined
  readonly inventoryLevel?: ProductInventoryLevel | undefined
  readonly minPrice?: NumericColumnFilterValue | undefined
  readonly search?: string | undefined
  readonly sort?: AdminProductsListSort | undefined
  readonly status?: ProductStatus | undefined
  readonly totalStock?: NumericColumnFilterValue | undefined
  readonly variantKind?: ProductVariantKind | undefined
}
