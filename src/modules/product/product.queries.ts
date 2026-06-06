import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { CONSTANTS } from "~/src/constants";
import { DEFAULT_LOCALE } from "~/src/constants/_constants/locales";

import type { DateColumnFilterValue, NumericColumnFilterValue } from "~/src/lib/_utils/admin-column-filters";
import { normalizeAdminSearchTerm } from "~/src/lib/_utils/admin-search.server";
import { buildListPaginationResult, LIST_PAGE_FIRST, listPaginationParamsFromPage } from "~/src/lib/_utils/list-pagination";

import {
  productAccessors,
  type AdminProductsExportListParams,
  type AdminProductsListParams
} from "~/src/modules/product/product.accessors";
import type { AdminProductsListSort } from "~/src/modules/product/product.admin-list-sort";
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  PRODUCT_QUERY_STALE_MS,
  type ProductInventoryLevel,
  type ProductStatus
} from "~/src/modules/product/product.constants";
import type { Product } from "~/src/modules/product/product.types";
import {
  buildVariantStatsByProductId,
  mapPublishedProductForStorefront,
  toAdminProductListItem,
  type AdminProductDetail
} from "~/src/modules/product/product.utils";

const ZERO_COUNT = 0;

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
  const [products, variantStats] = await Promise.all([
    productAccessors.getAdminProductsCatalogList(),
    productAccessors.getProductVariantStatsQuery.execute()
  ]);

  const statsByProductId = buildVariantStatsByProductId(variantStats);
  return products.map((row) => toAdminProductListItem(row, statsByProductId));
}

async function getAdminProductListPage(
  params: AdminProductsListParams
): Promise<ReturnType<typeof buildListPaginationResult<Product["adminListItem"]>>> {
  const [{ rows, total }, variantStats] = await Promise.all([
    productAccessors.getAdminProductsPage(params),
    productAccessors.getProductVariantStatsQuery.execute()
  ]);

  const statsByProductId = buildVariantStatsByProductId(variantStats);
  const items = rows.map((row) => toAdminProductListItem(row, statsByProductId));

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
  return productAccessors.getPublishedProductsQuery.execute();
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

  if (prod === undefined) {
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
  "categoryId" | "collectionId" | "createdAt" | "inventoryLevel" | "minPrice" | "search" | "sort" | "status" | "totalStock"
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
    totalStock: input.totalStock
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
  const [rows, variantStats] = await Promise.all([
    productAccessors.getAdminProductsFilteredList(buildAdminProductsExportParams(input)),
    productAccessors.getProductVariantStatsQuery.execute()
  ]);

  const statsByProductId = buildVariantStatsByProductId(variantStats);
  return rows.map((row) => toAdminProductListItem(row, statsByProductId));
}

const fetchProductsFn = createServerFn({ method: "GET" }).handler(() => getPublishedProducts());

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
  fetchProductByHandleFn,
  fetchProductStatsFn,
  fetchProductsFn,
  fetchRelatedProductsFn
};

export const productQueryOptions = {
  adminProductByHandleQueryOptions: (handle: string) =>
    queryOptions({
      enabled: handle !== "" && handle !== "new",
      queryFn: () => fetchAdminProductByHandleFn({ data: handle }),
      queryKey: [...CONSTANTS.QUERY_KEYS.PRODUCT.ADMIN.BY_HANDLE, handle] as const,
      refetchOnMount: false,
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
    })
};

export async function prefetchAdminProductByHandle(queryClient: QueryClient, handle: string): Promise<void> {
  await queryClient.prefetchQuery(productQueryOptions.adminProductByHandleQueryOptions(handle));
}

export function hasCachedAdminProductByHandle(queryClient: QueryClient, handle: string): boolean {
  return queryClient.getQueryData(productQueryOptions.adminProductByHandleQueryOptions(handle).queryKey) !== undefined;
}
