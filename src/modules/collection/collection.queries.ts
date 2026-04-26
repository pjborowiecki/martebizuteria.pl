import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { collection } from "~/src/modules/collection/collection.schema";
import { product } from "~/src/modules/product/product.schema";

export const fetchCollectionsFn = createServerFn({ method: "GET" }).handler(() =>
  db.query.collection.findMany({
    limit: 20,
    orderBy: (collections, { desc }) => [desc(collections.createdAt)]
  })
);

export const fetchCollectionByHandleFn = createServerFn({ method: "GET" })
  .inputValidator((handle: string) => handle)
  .handler(async ({ data: handle }) => {
    const coll = await db.query.collection.findFirst({
      where: eq(collection.handle, handle)
    });

    if (coll === undefined) {
      return false;
    }

    const products = await db.query.product.findMany({
      limit: 20,
      where: eq(product.collectionId, coll.id),
      with: {
        variants: true
      }
    });

    return { ...coll, products };
  });

export const collectionsQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchCollectionsFn(),
    queryKey: ["collections"]
  });

export const collectionQueryOptions = (handle: string) =>
  queryOptions({
    queryFn: () => fetchCollectionByHandleFn({ data: handle }),
    queryKey: ["collection", handle]
  });
