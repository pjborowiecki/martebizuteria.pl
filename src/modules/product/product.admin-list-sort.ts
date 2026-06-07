import type { SortingState } from "@tanstack/react-table";

import { PRODUCT_TABLE_COLUMN_ID } from "~/src/modules/product/product.constants";

export interface AdminProductsListSort {
  readonly columnId: string;
  readonly desc: boolean;
}

const SERVER_SORTABLE_COLUMN_IDS = new Set<string>([
  PRODUCT_TABLE_COLUMN_ID.title,
  PRODUCT_TABLE_COLUMN_ID.recordId,
  PRODUCT_TABLE_COLUMN_ID.status,
  PRODUCT_TABLE_COLUMN_ID.minPrice,
  PRODUCT_TABLE_COLUMN_ID.stock,
  PRODUCT_TABLE_COLUMN_ID.variantKind,
  PRODUCT_TABLE_COLUMN_ID.createdAt,
  PRODUCT_TABLE_COLUMN_ID.editedAt
]);

export function parseAdminProductsListSort(sorting: SortingState): AdminProductsListSort | undefined {
  const [active] = sorting;
  if (active === undefined || !SERVER_SORTABLE_COLUMN_IDS.has(active.id)) {
    return undefined;
  }

  return { columnId: active.id, desc: active.desc };
}

export function adminProductsListSortRequiresVariantStats(sort: AdminProductsListSort | undefined): boolean {
  if (sort === undefined) {
    return false;
  }

  return (
    sort.columnId === PRODUCT_TABLE_COLUMN_ID.minPrice ||
    sort.columnId === PRODUCT_TABLE_COLUMN_ID.stock ||
    sort.columnId === PRODUCT_TABLE_COLUMN_ID.variantKind
  );
}
