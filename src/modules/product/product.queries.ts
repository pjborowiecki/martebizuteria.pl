import { infiniteQueryOptions, queryOptions, type InfiniteData, type QueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { CONSTANTS } from "~/src/constants";
import { DEFAULT_LOCALE } from "~/src/constants/_constants/locales";

import type { DateColumnFilterValue, NumericColumnFilterValue } from "~/src/lib/_utils/admin-column-filters";
import { normalizeAdminSearchTerm } from "~/src/lib/_utils/admin-search.server";
import {
  buildListPaginationResult,
  LIST_PAGE_FIRST,
  LIST_PAGE_STEP,
  listPaginationParamsFromPage,
  type ListPaginationResult
} from "~/src/lib/_utils/list-pagination";
import { catalogDebugLog } from "~/src/lib/dev/catalog-debug-log";

import { isProductInStock } from "~/src/modules/inventory/inventory.availability.utils";
import { categoryAccessors } from "~/src/modules/product-category/product-category.accessors";
import { collectDescendantCategoryIds } from "~/src/modules/product-category/product-category.utils";
import { collectionAccessors } from "~/src/modules/product-collection/product-collection.accessors";
import {
  productAccessors,
  type AdminProductsExportListParams,
  type AdminProductsListParams
} from "~/src/modules/product/product.accessors";
import type { AdminProductsListSort } from "~/src/modules/product/product.admin-list-sort";
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  LANDING_NEW_ARRIVALS_COLLECTION_HANDLE,
  LANDING_NEW_ARRIVALS_PRODUCT_LIMIT,
  PRODUCT_QUERY_STALE_MS,
  PRODUCT_STOREFRONT_CATALOG_PAGE_SIZE,
  PRODUCT_STOREFRONT_FILTERED_MAX,
  type ProductInventoryLevel,
  type ProductStatus,
  type ProductVariantKind
} from "~/src/modules/product/product.constants";
import {
  buildEffectiveStorefrontProductsSearch,
  hasActiveStorefrontProductFilters,
  normalizeStorefrontProductsSearch,
  storefrontCatalogFilterOptions,
  storefrontProductsSearchSchema,
  type StorefrontCatalogScope,
  type StorefrontProductsPageInput,
  type StorefrontProductsSearch
} from "~/src/modules/product/product.storefront-catalog";
import type { Product } from "~/src/modules/product/product.types";
import {
  buildSkuSummaryByProductId,
  buildVariantStatsByProductId,
  mapPublishedProductForStorefront,
  toAdminProductListItem,
  type AdminProductDetail
} from "~/src/modules/product/product.utils";

const ZERO_COUNT = 0;
const CENTS_PER_PLN = 100;

const storefrontProductsPageInputSchema = storefrontProductsSearchSchema.extend({
  page: z.coerce.number().int().min(LIST_PAGE_FIRST).optional()
});

export interface AdminProductsPageInput {
  readonly categoryId?: string;
  readonly collectionId?: string;
  readonly createdAt?: DateColumnFilterValue;
  readonly inventoryLevel?: ProductInventoryLevel;
  readonly minPrice?: NumericColumnFilterValue;
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
  readonly sort?: AdminProductsListSort;
  readonly status?: ProductStatus;
  readonly totalStock?: NumericColumnFilterValue;
  readonly variantKind?: ProductVariantKind;
}

export interface AdminProductsExportInput {
  readonly categoryId?: string;
  readonly collectionId?: string;
  readonly createdAt?: DateColumnFilterValue;
  readonly inventoryLevel?: ProductInventoryLevel;
  readonly minPrice?: NumericColumnFilterValue;
  readonly search?: string;
  readonly sort?: AdminProductsListSort;
  readonly status?: ProductStatus;
  readonly totalStock?: NumericColumnFilterValue;
  readonly variantKind?: ProductVariantKind;
}

async function loadAdminListAggregates() {
  const [variantStats, skuRows] = await Promise.all([
    productAccessors.getProductVariantStatsQuery.execute(),
    productAccessors.getProductVariantSkuRowsQuery.execute()
  ]);

  return {
    skuSummaryByProductId: buildSkuSummaryByProductId(skuRows),
    statsByProductId: buildVariantStatsByProductId(variantStats)
  };
}

interface RelatedProductsInput {
  readonly categoryId: string | null | undefined;
  readonly excludeProductId: string;
  readonly locale: string;
}

interface ProductByHandleInput {
  readonly handle: string;
  readonly locale: string;
}

async function getAdminProductListItems(): Promise<Product["adminListItem"][]> {
  const [products, aggregates] = await Promise.all([productAccessors.getAdminProductsCatalogList(), loadAdminListAggregates()]);

  return products.map((row) => toAdminProductListItem(row, aggregates.statsByProductId, aggregates.skuSummaryByProductId));
}

async function getAdminProductListPage(
  params: AdminProductsListParams
): Promise<ReturnType<typeof buildListPaginationResult<Product["adminListItem"]>>> {
  const [{ rows, total }, aggregates] = await Promise.all([productAccessors.getAdminProductsPage(params), loadAdminListAggregates()]);

  const items = rows.map((row) => toAdminProductListItem(row, aggregates.statsByProductId, aggregates.skuSummaryByProductId));

  return buildListPaginationResult(items, total, params);
}

async function getAdminProductByHandle(handle: string): Promise<AdminProductDetail | undefined> {
  const row = await productAccessors.getProductByHandleQuery.execute({ handle });
  return row ?? undefined;
}

async function getLowStockPublishedProductCount(): Promise<number> {
  const [row] = await productAccessors.getLowStockPublishedProductCountQuery.execute();
  return row?.count ?? ZERO_COUNT;
}

function getPublishedProducts() {
  return productAccessors.getPublishedProductsInStock();
}

async function getLandingNewArrivalsProducts(): Promise<Awaited<ReturnType<typeof getPublishedProducts>>> {
  const collection = await collectionAccessors.getStorefrontCollectionByHandleQuery.execute({
    handle: LANDING_NEW_ARRIVALS_COLLECTION_HANDLE
  });

  if (collection === undefined) {
    return [];
  }

  const { items } = await productAccessors.getPublishedProductsByCollectionId(collection.id, {
    limit: LANDING_NEW_ARRIVALS_PRODUCT_LIMIT,
    offset: ZERO_COUNT
  });

  return items;
}

async function getProductStats(): Promise<Product["stats"]> {
  const [[counts], lowStock] = await Promise.all([
    productAccessors.getProductStatusCountsQuery.execute(),
    getLowStockPublishedProductCount()
  ]);

  return {
    active: counts?.active ?? ZERO_COUNT,
    archived: counts?.archived ?? ZERO_COUNT,
    draft: counts?.draft ?? ZERO_COUNT,
    lowStock,
    total: counts?.total ?? ZERO_COUNT
  };
}

async function getPublishedProductByHandle(handle: string, locale: string = DEFAULT_LOCALE) {
  const prod = await productAccessors.getPublishedProductByHandleQuery.execute({ handle });

  if (prod === undefined || !isProductInStock(prod.variants)) {
    return false;
  }

  return mapPublishedProductForStorefront(prod, locale);
}

function getRelatedProducts({ categoryId, excludeProductId }: RelatedProductsInput) {
  if (categoryId === null || categoryId === undefined) {
    return [];
  }

  return productAccessors.getPublishedRelatedProducts(categoryId, excludeProductId);
}

function buildAdminProductsFilterParams(
  input: AdminProductsPageInput | AdminProductsExportInput
): Pick<
  AdminProductsExportListParams,
  "categoryId" | "collectionId" | "createdAt" | "inventoryLevel" | "minPrice" | "search" | "sort" | "status" | "totalStock" | "variantKind"
> {
  return {
    categoryId: input.categoryId,
    collectionId: input.collectionId,
    createdAt: input.createdAt,
    inventoryLevel: input.inventoryLevel,
    minPrice: input.minPrice,
    search: normalizeAdminSearchTerm(input.search),
    sort: input.sort,
    status: input.status,
    totalStock: input.totalStock,
    variantKind: input.variantKind
  };
}

function buildAdminProductsListParams(input: AdminProductsPageInput): AdminProductsListParams {
  const pageSize = input.pageSize ?? ADMIN_PRODUCTS_PAGE_SIZE;

  return {
    ...listPaginationParamsFromPage(input.page ?? LIST_PAGE_FIRST, pageSize),
    ...buildAdminProductsFilterParams(input)
  };
}

function buildAdminProductsExportParams(input: AdminProductsExportInput): AdminProductsExportListParams {
  return buildAdminProductsFilterParams(input);
}

async function getAdminProductsExport(input: AdminProductsExportInput): Promise<Product["adminListItem"][]> {
  const [rows, aggregates] = await Promise.all([
    productAccessors.getAdminProductsFilteredList(buildAdminProductsExportParams(input)),
    loadAdminListAggregates()
  ]);

  return rows.map((row) => toAdminProductListItem(row, aggregates.statsByProductId, aggregates.skuSummaryByProductId));
}

async function resolveStorefrontCategoryIdsForSearch(categoryHandle: string | undefined): Promise<string[] | undefined> {
  if (categoryHandle === undefined) {
    return;
  }

  const category = await categoryAccessors.getStorefrontCategoryByHandleQuery.execute({ handle: categoryHandle });
  if (category === undefined) {
    return [];
  }

  const hierarchy = await categoryAccessors.getCategoryHierarchyQuery.execute();
  return collectDescendantCategoryIds(category.id, hierarchy);
}

async function resolveStorefrontCollectionIdForSearch(collectionHandle: string | undefined): Promise<string | undefined> {
  if (collectionHandle === undefined) {
    return;
  }

  const collection = await collectionAccessors.getStorefrontCollectionByHandleQuery.execute({ handle: collectionHandle });
  return collection?.id;
}

async function resolveStorefrontCatalogFilters(search: StorefrontProductsSearch) {
  const categoryIds = await resolveStorefrontCategoryIdsForSearch(search.category);
  const collectionId = await resolveStorefrontCollectionIdForSearch(search.collection);

  return {
    categoryIds,
    collectionId,
    maxPriceCents: search.maxPrice === undefined ? undefined : Math.round(search.maxPrice * CENTS_PER_PLN),
    minPriceCents: search.minPrice === undefined ? undefined : Math.round(search.minPrice * CENTS_PER_PLN),
    searchTerm: search.q,
    sort: search.sort
  };
}

async function getStorefrontProductsPage(input: StorefrontProductsPageInput) {
  const startedAt = performance.now();
  const search = normalizeStorefrontProductsSearch(storefrontProductsPageInputSchema.parse(input));
  const page = input.page ?? LIST_PAGE_FIRST;
  const filtered = hasActiveStorefrontProductFilters(search);
  const pageSize = filtered ? PRODUCT_STOREFRONT_FILTERED_MAX : PRODUCT_STOREFRONT_CATALOG_PAGE_SIZE;
  const listParams = listPaginationParamsFromPage(page, pageSize);
  const filters = await resolveStorefrontCatalogFilters(search);

  catalogDebugLog("storefrontProductsPage.start", { filters, page, search });

  if (filters.categoryIds?.length === ZERO_COUNT) {
    catalogDebugLog("storefrontProductsPage.emptyCategory", { search });
    return buildListPaginationResult([], ZERO_COUNT, listParams);
  }

  const { items, total } = await productAccessors.getStorefrontPublishedProductsPage({
    ...listParams,
    categoryIds: filters.categoryIds,
    collectionId: filters.collectionId,
    maxPriceCents: filters.maxPriceCents,
    minPriceCents: filters.minPriceCents,
    searchTerm: filters.searchTerm,
    sort: filters.sort
  });

  catalogDebugLog("storefrontProductsPage.done", {
    collectionId: filters.collectionId,
    itemCount: items.length,
    ms: Math.round(performance.now() - startedAt),
    page,
    total
  });

  return buildListPaginationResult(items, total, listParams);
}

type StorefrontProductsPage = ListPaginationResult<
  Awaited<ReturnType<typeof productAccessors.getStorefrontPublishedProductsPage>>["items"][number]
>;

const fetchProductsFn = createServerFn({ method: "GET" }).handler(() => getPublishedProducts());

const fetchStorefrontProductsPageFn = createServerFn({ method: "GET" })
  .inputValidator((input: StorefrontProductsPageInput) => storefrontProductsPageInputSchema.parse(input))
  .handler(({ data }) => getStorefrontProductsPage(data));

const fetchLandingNewArrivalsProductsFn = createServerFn({ method: "GET" }).handler(() => getLandingNewArrivalsProducts());

const fetchAdminProductsFn = createServerFn({ method: "GET" }).handler(() => getAdminProductListItems());

const fetchAdminProductsPageFn = createServerFn({ method: "GET" })
  .inputValidator((input: AdminProductsPageInput) => input)
  .handler(({ data }) => getAdminProductListPage(buildAdminProductsListParams(data)));

const fetchAdminProductsExportFn = createServerFn({ method: "GET" })
  .inputValidator((input: AdminProductsExportInput) => input)
  .handler(({ data }) => getAdminProductsExport(data));

const fetchProductStatsFn = createServerFn({ method: "GET" }).handler(() => getProductStats());

const fetchAdminProductByHandleFn = createServerFn({ method: "GET" })
  .inputValidator((handle: string) => handle)
  .handler(({ data: handle }) => getAdminProductByHandle(handle));

const fetchProductByHandleFn = createServerFn({ method: "GET" })
  .inputValidator((input: ProductByHandleInput) => input)
  .handler(({ data }) => getPublishedProductByHandle(data.handle, data.locale));

const fetchRelatedProductsFn = createServerFn({ method: "GET" })
  .inputValidator((input: RelatedProductsInput) => input)
  .handler(({ data }) => getRelatedProducts(data));

export const productQueries = {
  fetchAdminProductByHandleFn,
  fetchAdminProductsExportFn,
  fetchAdminProductsFn,
  fetchAdminProductsPageFn,
  fetchLandingNewArrivalsProductsFn,
  fetchProductByHandleFn,
  fetchProductStatsFn,
  fetchProductsFn,
  fetchRelatedProductsFn,
  fetchStorefrontProductsPageFn
};

export const productQueryOptions = {
  adminProductByHandleQueryOptions: (handle: string) =>
    queryOptions({
      enabled: handle !== "" && handle !== "new",
      queryFn: () => fetchAdminProductByHandleFn({ data: handle }),
      queryKey: [...CONSTANTS.QUERY_KEYS.PRODUCT.ADMIN.BY_HANDLE, handle] as const,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: PRODUCT_QUERY_STALE_MS
    }),
  adminProductsPageQueryOptions: (input: AdminProductsPageInput) =>
    queryOptions({
      queryFn: () => fetchAdminProductsPageFn({ data: input }),
      queryKey: [...CONSTANTS.QUERY_KEYS.PRODUCT.ADMIN.PAGE, input] as const,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: PRODUCT_QUERY_STALE_MS
    }),
  adminProductsQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchAdminProductsFn(),
      queryKey: CONSTANTS.QUERY_KEYS.PRODUCT.ADMIN.ALL,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: PRODUCT_QUERY_STALE_MS
    }),
  landingNewArrivalsQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchLandingNewArrivalsProductsFn(),
      queryKey: CONSTANTS.QUERY_KEYS.PRODUCT.LANDING_NEW_ARRIVALS,
      staleTime: PRODUCT_QUERY_STALE_MS
    }),
  productQueryOptions: (handle: string, locale: string = DEFAULT_LOCALE) =>
    queryOptions({
      queryFn: () => fetchProductByHandleFn({ data: { handle, locale } }),
      queryKey: [...CONSTANTS.QUERY_KEYS.PRODUCT.BY_HANDLE, handle, locale] as const
    }),
  productStatsQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchProductStatsFn(),
      queryKey: CONSTANTS.QUERY_KEYS.PRODUCT.ADMIN.STATS,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: PRODUCT_QUERY_STALE_MS
    }),
  productsQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchProductsFn(),
      queryKey: CONSTANTS.QUERY_KEYS.PRODUCT.ALL
    }),
  relatedProductsQueryOptions: (categoryId: string | null | undefined, excludeProductId: string, locale: string = DEFAULT_LOCALE) =>
    queryOptions({
      queryFn: () => fetchRelatedProductsFn({ data: { categoryId, excludeProductId, locale } }),
      queryKey: [...CONSTANTS.QUERY_KEYS.PRODUCT.RELATED_BY_CATEGORY, categoryId, excludeProductId, locale] as const
    }),
  storefrontProductsInfiniteQueryOptions: (search: StorefrontProductsSearch, scope?: StorefrontCatalogScope) => {
    const normalized = normalizeStorefrontProductsSearch(search);
    const effective = buildEffectiveStorefrontProductsSearch(normalized, scope);
    const filtered = hasActiveStorefrontProductFilters(effective, storefrontCatalogFilterOptions(scope));

    return infiniteQueryOptions<
      StorefrontProductsPage,
      Error,
      InfiniteData<StorefrontProductsPage, number>,
      readonly [...typeof CONSTANTS.QUERY_KEYS.PRODUCT.STOREFRONT_PAGE, StorefrontProductsSearch],
      number
    >({
      getNextPageParam: (lastPage, _allPages, lastPageParam) => {
        if (filtered) {
          return;
        }

        if (!lastPage.hasMore) {
          return;
        }

        return lastPageParam + LIST_PAGE_STEP;
      },
      initialPageParam: LIST_PAGE_FIRST,
      queryFn: ({ pageParam }) => fetchStorefrontProductsPageFn({ data: { ...effective, page: pageParam } }),
      queryKey: [...CONSTANTS.QUERY_KEYS.PRODUCT.STOREFRONT_PAGE, effective] as const,
      staleTime: PRODUCT_QUERY_STALE_MS
    });
  }
};

export async function prefetchAdminProductByHandle(queryClient: QueryClient, handle: string): Promise<void> {
  await queryClient.prefetchQuery(productQueryOptions.adminProductByHandleQueryOptions(handle));
}

export function hasCachedAdminProductByHandle(queryClient: QueryClient, handle: string): boolean {
  return queryClient.getQueryData(productQueryOptions.adminProductByHandleQueryOptions(handle).queryKey) !== undefined;
}
