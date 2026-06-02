import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { collectionAccessors } from "~/src/modules/collection/collection.accessors";
import { COLLECTION_QUERY_STALE_MS } from "~/src/modules/collection/collection.constants";
import type { Collection } from "~/src/modules/collection/collection.types";

const ZERO_COUNT = 0;
const AVG_DECIMALS = 10;

const fetchCollectionsFn = createServerFn({ method: "GET" }).handler(() => collectionAccessors.getCollectionsQuery.execute());

function toAdminListItem(row: Collection["select"], productCount: number): Collection["adminListItem"] {
  return {
    ...row,
    productCount
  };
}

const fetchAdminCollectionsFn = createServerFn({ method: "GET" }).handler(async () => {
  const [collections, counts] = await Promise.all([
    collectionAccessors.getCollectionsQuery.execute(),
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
    const coll = await collectionAccessors.getCollectionByHandleQuery.execute({ handle });

    if (coll === undefined) {
      return false;
    }

    const products = await collectionAccessors.getProductsByCollectionIdQuery.execute({
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
      queryKey: ["admin", "collections"],
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: COLLECTION_QUERY_STALE_MS
    }),
  collectionQueryOptions: (handle: string) =>
    queryOptions({
      queryFn: () => fetchCollectionByHandleFn({ data: handle }),
      queryKey: ["collection", handle],
      staleTime: COLLECTION_QUERY_STALE_MS
    }),
  collectionStatsQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchCollectionStatsFn(),
      queryKey: ["admin", "collections", "stats"],
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: COLLECTION_QUERY_STALE_MS
    }),
  collectionsQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchCollectionsFn(),
      queryKey: ["collections"],
      staleTime: COLLECTION_QUERY_STALE_MS
    })
};
