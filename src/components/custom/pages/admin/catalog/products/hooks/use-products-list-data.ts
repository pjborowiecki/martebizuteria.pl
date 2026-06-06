import { useMemo } from "react";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PaginationState } from "@tanstack/react-table";

import { LIST_PAGE_STEP } from "~/src/lib/utils";

import { useProductOrdering } from "~/src/components/custom/pages/admin/catalog/products/hooks/use-product-ordering";
import type { ProductsListFilters } from "~/src/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid";
import { useReorderProducts } from "~/src/components/custom/pages/admin/catalog/products/hooks/use-reorder-products";

import type { AdminProductsListColumnFilters } from "~/src/modules/product/product.admin-list-filters";
import type { AdminProductsListSort } from "~/src/modules/product/product.admin-list-sort";
import { ADMIN_PRODUCTS_PAGE_SIZE } from "~/src/modules/product/product.constants";
import { productQueryOptions } from "~/src/modules/product/product.queries";
import type { Product } from "~/src/modules/product/product.types";

const EMPTY_PRODUCTS_PAGE = {
  hasMore: false,
  items: [] as Product["adminListItem"][],
  limit: ADMIN_PRODUCTS_PAGE_SIZE,
  offset: 0,
  total: 0
} as const;

interface UseProductsListDataOptions {
  readonly columnFilters: AdminProductsListColumnFilters;
  readonly filters: ProductsListFilters;
  readonly hasServerListQuery: boolean;
  readonly pagination: PaginationState;
  readonly search?: string;
  readonly sort?: AdminProductsListSort;
}

export function useProductsListData({ columnFilters, filters, hasServerListQuery, pagination, search, sort }: UseProductsListDataOptions) {
  const pageQueryOptions = productQueryOptions.adminProductsPageQueryOptions({
    categoryId: filters.categoryId,
    collectionId: filters.collectionId,
    createdAt: columnFilters.createdAt,
    inventoryLevel: filters.inventoryLevel,
    minPrice: columnFilters.minPrice,
    page: pagination.pageIndex + LIST_PAGE_STEP,
    pageSize: pagination.pageSize,
    search,
    sort,
    status: filters.status,
    totalStock: columnFilters.totalStock
  });

  const {
    data: allProducts = [],
    isFetching: isAllFetching,
    isPending: isAllPending
  } = useQuery({
    ...productQueryOptions.adminProductsQueryOptions(),
    enabled: !hasServerListQuery,
    placeholderData: keepPreviousData
  });

  const {
    data = EMPTY_PRODUCTS_PAGE,
    isFetching: isPageFetching,
    isPending: isPagePending
  } = useQuery({
    ...pageQueryOptions,
    enabled: hasServerListQuery,
    placeholderData: keepPreviousData
  });

  const reorder = useReorderProducts();
  const ordering = useProductOrdering(hasServerListQuery ? [] : allProducts, reorder);
  const tableData = useMemo(
    () => (hasServerListQuery ? [...data.items] : ordering.items),
    [data.items, hasServerListQuery, ordering.items]
  );

  return useMemo(
    () => ({
      ordering,
      pageCount: hasServerListQuery ? Math.ceil(data.total / pagination.pageSize) : undefined,
      rowCount: hasServerListQuery ? data.total : undefined,
      showSkeletonRows: hasServerListQuery ? isPageFetching || isPagePending : isAllFetching || isAllPending,
      tableData
    }),
    [data.total, hasServerListQuery, isAllFetching, isAllPending, isPageFetching, isPagePending, ordering, pagination.pageSize, tableData]
  );
}
