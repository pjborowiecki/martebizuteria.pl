import { eq, sql } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { collection } from "~/src/modules/collection/collection.schema";
import { product } from "~/src/modules/product/product.schema";

const getCollectionsQuery = db.query.collection
  .findMany({
    limit: 20,
    orderBy: (collections, { desc }) => [desc(collections.createdAt)]
  })
  .prepare();

const getCollectionByHandleQuery = db.query.collection
  .findFirst({
    where: eq(collection.handle, sql.placeholder("handle"))
  })
  .prepare();

const getProductsByCollectionIdQuery = db.query.product
  .findMany({
    limit: 20,
    where: eq(product.collectionId, sql.placeholder("collectionId")),
    with: { variants: true }
  })
  .prepare();

export const collectionAccessors = {
  getCollectionByHandleQuery,
  getCollectionsQuery,
  getProductsByCollectionIdQuery
};
