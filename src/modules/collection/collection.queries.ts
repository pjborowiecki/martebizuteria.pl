import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { collectionAccessors } from "~/src/modules/collection/collection.accessors";

const fetchCollectionsFn = createServerFn({ method: "GET" }).handler(() => collectionAccessors.getCollectionsQuery.execute());

const fetchCollectionByHandleFn = createServerFn({ method: "GET" })
  .inputValidator((handle: string) => handle)
  .handler(async ({ data: handle }) => {
    const coll = await collectionAccessors.getCollectionByHandleQuery.execute({ handle });

    if (coll === undefined) {
      return false;
    }

    const products = await collectionAccessors.getProductsByCollectionIdQuery.execute({ collectionId: coll.id });

    return { ...coll, products };
  });

export const collectionQueries = {
  fetchCollectionByHandleFn,
  fetchCollectionsFn
};

export const collectionQueryOptions = {
  collectionQueryOptions: (handle: string) =>
    queryOptions({
      queryFn: () => fetchCollectionByHandleFn({ data: handle }),
      queryKey: ["collection", handle]
    }),
  collectionsQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchCollectionsFn(),
      queryKey: ["collections"]
    })
};
