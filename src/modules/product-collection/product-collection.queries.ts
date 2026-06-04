import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { CONSTANTS } from "~/src/constants";

import { buildListPaginationResult, LIST_PAGE_FIRST, listPaginationParamsFromPage } from "~/src/lib/_utils/list-pagination";

import { collectionOnProductAccessors } from "~/src/modules/collection-on-product/collection-on-product.accessors";
import { collectionAccessors } from "~/src/modules/product-collection/product-collection.accessors";
import { COLLECTION_QUERY_STALE_MS } from "~/src/modules/product-collection/product-collection.constants";
import { computeCollectionStats, toAdminCollectionListItem } from "~/src/modules/product-collection/product-collection.utils";
import { productAccessors } from "~/src/modules/product/product.accessors";
import { PRODUCT_STOREFRONT_LIST_LIMIT } from "~/src/modules/product/product.constants";

const ZERO_COUNT = 0;

const fetchCollectionsFn = createServerFn({ method: "GET" }).handler(() => collectionAccessors.getStorefrontCollectionsQuery.execute());

const fetchAdminCollectionsFn = createServerFn({ method: "GET" }).handler(async () => {
  const [collections, counts] = await Promise.all([
    collectionAccessors.getAdminCollectionsQuery.execute(),
    collectionOnProductAccessors.getProductCountsQuery.execute()
  ]);

  const countByCollectionId = new Map(counts.map((entry) => [entry.collectionId, entry.count]));

  return collections.map((row) => toAdminCollectionListItem(row, countByCollectionId.get(row.id) ?? ZERO_COUNT));
});

const fetchCollectionStatsFn = createServerFn({ method: "GET" }).handler(async () => {
  const [[counts], [products]] = await Promise.all([
    collectionAccessors.getCollectionStatusCountsQuery.execute(),
    collectionOnProductAccessors.getCollectionProductTotalQuery.execute()
  ]);

  return computeCollectionStats(counts, products?.value ?? ZERO_COUNT);
});

interface CollectionByHandleInput {
  readonly handle: string;
  readonly page?: number;
}

const fetchCollectionByHandleFn = createServerFn({ method: "GET" })
  .inputValidator((input: CollectionByHandleInput) => input)
  .handler(async ({ data: { handle, page = LIST_PAGE_FIRST } }) => {
    const coll = await collectionAccessors.getStorefrontCollectionByHandleQuery.execute({ handle });

    if (coll === undefined) {
      return false;
    }

    const listParams = listPaginationParamsFromPage(page, PRODUCT_STOREFRONT_LIST_LIMIT);
    const { items, total } = await productAccessors.getPublishedProductsByCollectionId(coll.id, listParams);

    return { ...coll, products: buildListPaginationResult(items, total, listParams) };
  });

export const collectionQueries = {
  fetchAdminCollectionsFn,
  fetchCollectionByHandleFn,
  fetchCollectionStatsFn,
  fetchCollectionsFn
};

export const collectionQueryOptions = {
  adminCollectionsQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchAdminCollectionsFn(),
      queryKey: CONSTANTS.QUERY_KEYS.COLLECTION.ADMIN.ALL,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: COLLECTION_QUERY_STALE_MS
    }),
  collectionQueryOptions: (handle: string, page = LIST_PAGE_FIRST) =>
    queryOptions({
      queryFn: () => fetchCollectionByHandleFn({ data: { handle, page } }),
      queryKey: [...CONSTANTS.QUERY_KEYS.COLLECTION.BY_HANDLE, handle, page] as const,
      staleTime: COLLECTION_QUERY_STALE_MS
    }),
  collectionStatsQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchCollectionStatsFn(),
      queryKey: CONSTANTS.QUERY_KEYS.COLLECTION.ADMIN.STATS,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: COLLECTION_QUERY_STALE_MS
    }),
  collectionsQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchCollectionsFn(),
      queryKey: CONSTANTS.QUERY_KEYS.COLLECTION.ALL,
      staleTime: COLLECTION_QUERY_STALE_MS
    })
};
