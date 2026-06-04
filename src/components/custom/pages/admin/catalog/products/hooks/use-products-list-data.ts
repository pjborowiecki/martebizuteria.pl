import { useMemo } from "react";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PaginationState } from "@tanstack/react-table";

import { LIST_PAGE_STEP } from "~/src/lib/utils";

import { useProductOrdering } from "~/src/components/custom/pages/admin/catalog/products/hooks/use-product-ordering";
import type { ProductsListFilters } from "~/src/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid";
import { useReorderProducts } from "~/src/components/custom/pages/admin/catalog/products/hooks/use-reorder-products";

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
  readonly filters: ProductsListFilters;
  readonly hasListFilters: boolean;
  readonly pagination: PaginationState;
}

export function useProductsListData({ filters, hasListFilters, pagination }: UseProductsListDataOptions) {
  const pageQueryOptions = productQueryOptions.adminProductsPageQueryOptions({
    categoryId: filters.categoryId,
    collectionId: filters.collectionId,
    inventoryLevel: filters.inventoryLevel,
    page: pagination.pageIndex + LIST_PAGE_STEP,
    pageSize: pagination.pageSize,
    status: filters.status
  });

  const {
    data: allProducts = [],
    isPending: isAllPending,
    isPlaceholderData: isAllPlaceholderData
  } = useQuery({
    ...productQueryOptions.adminProductsQueryOptions(),
    enabled: !hasListFilters,
    placeholderData: keepPreviousData
  });

  const {
    data = EMPTY_PRODUCTS_PAGE,
    isPending: isPagePending,
    isPlaceholderData: isPagePlaceholderData
  } = useQuery({
    ...pageQueryOptions,
    enabled: hasListFilters,
    placeholderData: keepPreviousData
  });

  const reorder = useReorderProducts();
  const ordering = useProductOrdering(hasListFilters ? [] : allProducts, reorder);
  const tableData = useMemo(() => (hasListFilters ? [...data.items] : ordering.items), [data.items, hasListFilters, ordering.items]);

  return useMemo(
    () => ({
      ordering,
      pageCount: hasListFilters ? Math.ceil(data.total / pagination.pageSize) : undefined,
      rowCount: hasListFilters ? data.total : undefined,
      showSkeletonRows: hasListFilters ? isPagePending && !isPagePlaceholderData : isAllPending && !isAllPlaceholderData,
      tableData
    }),
    [
      data.total,
      hasListFilters,
      isAllPending,
      isAllPlaceholderData,
      isPagePending,
      isPagePlaceholderData,
      ordering,
      pagination.pageSize,
      tableData
    ]
  );
}
