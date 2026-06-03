import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { CONSTANTS } from "~/src/constants";

import { categoryAccessors } from "~/src/modules/category/category.accessors";
import { CATEGORY_QUERY_STALE_MS } from "~/src/modules/category/category.constants";
import type { Category } from "~/src/modules/category/category.types";
import { productAccessors } from "~/src/modules/product/product.accessors";

const ZERO_COUNT = 0;
const AVG_DECIMALS = 10;

const fetchCategoriesFn = createServerFn({ method: "GET" }).handler(() => categoryAccessors.getStorefrontRootCategories());

function toAdminListItem(row: Category["select"], productCount: number, titleById: Map<string, string>): Category["adminListItem"] {
  const parentId = row.parentId ?? undefined;
  const parentTitle = parentId === undefined || parentId === "" ? undefined : titleById.get(parentId);

  return {
    ...row,
    parentTitle,
    productCount
  };
}

const fetchAdminCategoriesFn = createServerFn({ method: "GET" }).handler(async () => {
  const [categories, counts] = await Promise.all([
    categoryAccessors.getAdminCategoriesQuery.execute(),
    categoryAccessors.getProductCountsQuery.execute()
  ]);

  const countByCategoryId = new Map(counts.map((entry) => [entry.categoryId, entry.count]));
  const titleById = new Map(categories.map((row) => [row.id, row.title]));

  return categories.map((row) => toAdminListItem(row, countByCategoryId.get(row.id) ?? ZERO_COUNT, titleById));
});

const fetchCategoryStatsFn = createServerFn({ method: "GET" }).handler(async (): Promise<Category["stats"]> => {
  const [[counts], [products]] = await Promise.all([
    categoryAccessors.getCategoryStatusCountsQuery.execute(),
    categoryAccessors.getCategoryProductTotalQuery.execute()
  ]);

  const total = counts?.total ?? ZERO_COUNT;
  const productTotal = products?.value ?? ZERO_COUNT;
  const avgProducts = total === ZERO_COUNT ? ZERO_COUNT : Math.round((productTotal / total) * AVG_DECIMALS) / AVG_DECIMALS;

  return {
    active: counts?.active ?? ZERO_COUNT,
    avgProducts,
    draft: counts?.draft ?? ZERO_COUNT,
    total
  };
});

const fetchCategoryByHandleFn = createServerFn({ method: "GET" })
  .inputValidator((handle: string) => handle)
  .handler(async ({ data: handle }) => {
    const cat = await categoryAccessors.getStorefrontCategoryByHandleQuery.execute({ handle });

    if (cat === undefined) {
      return false;
    }

    const products = await productAccessors.getPublishedProductsByCategoryIdQuery.execute({ categoryId: cat.id });

    return { ...cat, products };
  });

export const categoryQueries = {
  fetchAdminCategoriesFn,
  fetchCategoriesFn,
  fetchCategoryByHandleFn,
  fetchCategoryStatsFn
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
  categoryQueryOptions: (handle: string) =>
    queryOptions({
      queryFn: () => fetchCategoryByHandleFn({ data: handle }),
      queryKey: CONSTANTS.QUERY_KEYS.CATEGORY.byHandle(handle),
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
