import { count, inArray, sql } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { collectionOnProduct } from "~/src/modules/collection-on-product/collection-on-product.schema";

const EMPTY_LENGTH = 0;
const ZERO_COUNT = 0;

const getProductCountsQuery = db
  .select({ collectionId: collectionOnProduct.collectionId, count: sql<number>`count(*)` })
  .from(collectionOnProduct)
  .groupBy(collectionOnProduct.collectionId)
  .prepare();

const getCollectionProductTotalQuery = db
  .select({ value: sql<number>`count(distinct ${collectionOnProduct.productId})` })
  .from(collectionOnProduct)
  .prepare();

async function countProductsForCollections(collectionIds: readonly string[]): Promise<number> {
  if (collectionIds.length === EMPTY_LENGTH) {
    return ZERO_COUNT;
  }

  const [row] = await db
    .select({ value: count() })
    .from(collectionOnProduct)
    .where(inArray(collectionOnProduct.collectionId, [...collectionIds]));

  return row?.value ?? ZERO_COUNT;
}

export const collectionOnProductAccessors = {
  countProductsForCollections,
  getCollectionProductTotalQuery,
  getProductCountsQuery
};
