import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { CONSTANTS } from "~/src/constants";

import { collectionAccessors } from "~/src/modules/collection/collection.accessors";
import { COLLECTION_QUERY_STALE_MS } from "~/src/modules/collection/collection.constants";
import type { Collection } from "~/src/modules/collection/collection.types";
import { productAccessors } from "~/src/modules/product/product.accessors";

const ZERO_COUNT = 0;
const AVG_DECIMALS = 10;

const fetchCollectionsFn = createServerFn({ method: "GET" }).handler(() => collectionAccessors.getStorefrontCollectionsQuery.execute());

function toAdminListItem(row: Collection["select"], productCount: number): Collection["adminListItem"] {
  return {
    ...row,
    productCount
  };
}

const fetchAdminCollectionsFn = createServerFn({ method: "GET" }).handler(async () => {
  const [collections, counts] = await Promise.all([
    collectionAccessors.getAdminCollectionsQuery.execute(),
    collectionAccessors.getProductCountsQuery.execute()
  ]);

  const countByCollectionId = new Map(counts.map((entry) => [entry.collectionId, entry.count]));

  return collections.map((row) => toAdminListItem(row, countByCollectionId.get(row.id) ?? ZERO_COUNT));
});

const fetchCollectionStatsFn = createServerFn({ method: "GET" }).handler(async (): Promise<Collection["stats"]> => {
  const [[counts], [products]] = await Promise.all([
    collectionAccessors.getCollectionStatusCountsQuery.execute(),
    collectionAccessors.getCollectionProductTotalQuery.execute()
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

const fetchCollectionByHandleFn = createServerFn({ method: "GET" })
  .inputValidator((handle: string) => handle)
  .handler(async ({ data: handle }) => {
    const coll = await collectionAccessors.getStorefrontCollectionByHandleQuery.execute({ handle });

    if (coll === undefined) {
      return false;
    }

    const products = await productAccessors.getPublishedProductsByCollectionIdQuery.execute({
      collectionId: coll.id
    });

    return { ...coll, products };
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
  collectionQueryOptions: (handle: string) =>
    queryOptions({
      queryFn: () => fetchCollectionByHandleFn({ data: handle }),
      queryKey: CONSTANTS.QUERY_KEYS.COLLECTION.byHandle(handle),
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
