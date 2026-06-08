import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { CONSTANTS } from "~/src/constants";

import { buildListPaginationResult, LIST_PAGE_FIRST, listPaginationParamsFromPage } from "~/src/lib/_utils/list-pagination";

import { categoryOnProductAccessors } from "~/src/modules/category-on-product/category-on-product.accessors";
import { categoryAccessors } from "~/src/modules/product-category/product-category.accessors";
import { CATEGORY_QUERY_STALE_MS } from "~/src/modules/product-category/product-category.constants";
import type { Category } from "~/src/modules/product-category/product-category.types";
import {
  collectDescendantCategoryIds,
  coerceCategoryLocaleMap,
  computeCategoryStats,
  toAdminCategoryListItem,
  withActiveSortedChildren
} from "~/src/modules/product-category/product-category.utils";
import { productAccessors } from "~/src/modules/product/product.accessors";
import { PRODUCT_STOREFRONT_LIST_LIMIT } from "~/src/modules/product/product.constants";

const CATEGORY_PRODUCT_COUNT_LIST_LIMIT = 1;
const ZERO_COUNT = 0;

async function getStorefrontRootCategories() {
  const [roots, hierarchy] = await Promise.all([
    categoryAccessors.getStorefrontRootCategoriesQuery.execute(),
    categoryAccessors.getCategoryHierarchyQuery.execute()
  ]);

  const rootsWithChildren = roots.map((root) => withActiveSortedChildren(root));
  const countListParams = listPaginationParamsFromPage(LIST_PAGE_FIRST, CATEGORY_PRODUCT_COUNT_LIST_LIMIT);

  return Promise.all(
    rootsWithChildren.map(async (root) => {
      const categoryIds = collectDescendantCategoryIds(root.id, hierarchy);
      const { total } = await productAccessors.getPublishedProductsByCategoryIds(categoryIds, countListParams);

      return Object.assign(root, { productCount: total }) as Category["storefrontListItem"];
    })
  );
}

const fetchCategoriesFn = createServerFn({ method: "GET" }).handler(() => getStorefrontRootCategories());

const fetchAdminCategoriesFn = createServerFn({ method: "GET" }).handler(async () => {
  const [categories, counts] = await Promise.all([
    categoryAccessors.getAdminCategoriesQuery.execute(),
    categoryOnProductAccessors.getProductCountsQuery.execute()
  ]);

  const countByCategoryId = new Map(counts.map((entry) => [entry.categoryId, entry.count]));
  const titlesById = new Map(categories.map((row) => [row.id, coerceCategoryLocaleMap(row.titles)]));

  return categories.map((row) => toAdminCategoryListItem(row, countByCategoryId.get(row.id) ?? ZERO_COUNT, titlesById));
});

const fetchCategoryStatsFn = createServerFn({ method: "GET" }).handler(async () => {
  const [[counts], [products]] = await Promise.all([
    categoryAccessors.getCategoryStatusCountsQuery.execute(),
    categoryOnProductAccessors.getCategoryProductTotalQuery.execute()
  ]);

  return computeCategoryStats(counts, products?.value ?? ZERO_COUNT);
});

interface CategoryByHandleInput {
  readonly handle: string;
  readonly page?: number;
}

const fetchStorefrontCategoryMetaFn = createServerFn({ method: "GET" })
  .inputValidator((handle: string) => handle)
  .handler(({ data: handle }) => categoryAccessors.getStorefrontCategoryByHandleQuery.execute({ handle }));

const fetchCategoryByHandleFn = createServerFn({ method: "GET" })
  .inputValidator((input: CategoryByHandleInput) => input)
  .handler(async ({ data: { handle, page = LIST_PAGE_FIRST } }) => {
    const cat = await categoryAccessors.getStorefrontCategoryByHandleQuery.execute({ handle });

    if (cat === undefined) {
      return false;
    }

    const hierarchy = await categoryAccessors.getCategoryHierarchyQuery.execute();
    const listParams = listPaginationParamsFromPage(page, PRODUCT_STOREFRONT_LIST_LIMIT);

    const categoryIds = collectDescendantCategoryIds(cat.id, hierarchy);
    const { items, total } = await productAccessors.getPublishedProductsByCategoryIds(categoryIds, listParams);

    return { ...cat, products: buildListPaginationResult(items, total, listParams) };
  });

export const categoryQueries = {
  fetchAdminCategoriesFn,
  fetchCategoriesFn,
  fetchCategoryByHandleFn,
  fetchCategoryStatsFn,
  fetchStorefrontCategoryMetaFn
};

export const categoryQueryOptions = {
  adminCategoriesQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchAdminCategoriesFn(),
      queryKey: CONSTANTS.QUERY_KEYS.CATEGORY.ADMIN.ALL,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: CATEGORY_QUERY_STALE_MS
    }),
  categoriesQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchCategoriesFn(),
      queryKey: CONSTANTS.QUERY_KEYS.CATEGORY.ALL,
      staleTime: CATEGORY_QUERY_STALE_MS
    }),
  categoryQueryOptions: (handle: string, page = LIST_PAGE_FIRST) =>
    queryOptions({
      queryFn: () => fetchCategoryByHandleFn({ data: { handle, page } }),
      queryKey: [...CONSTANTS.QUERY_KEYS.CATEGORY.BY_HANDLE, handle, page] as const,
      staleTime: CATEGORY_QUERY_STALE_MS
    }),
  categoryStatsQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchCategoryStatsFn(),
      queryKey: CONSTANTS.QUERY_KEYS.CATEGORY.ADMIN.STATS,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: CATEGORY_QUERY_STALE_MS
    })
};
