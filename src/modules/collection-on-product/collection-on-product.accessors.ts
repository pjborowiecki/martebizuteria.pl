import { count, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { inJsonList } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { collectionOnProduct } from "~/src/modules/collection-on-product/collection-on-product.schema"

export const countProductsForCollections = async (collectionIds: readonly string[]): Promise<number> => {
  if (collectionIds.length === 0) {
    return 0
  }

  const [row] = await db
    .select({
      value: count(),
    })
    .from(collectionOnProduct)
    .where(inJsonList(collectionOnProduct.collectionId, collectionIds))
  return row?.value ?? 0
}

export const getProductCountsQuery = db
  .select({
    collectionId: collectionOnProduct.collectionId,
    count: sql<number>`count(*)`,
  })
  .from(collectionOnProduct)
  .groupBy(collectionOnProduct.collectionId)
  .prepare()
export const getCollectionProductTotalQuery = db
  .select({
    value: sql<number>`count(distinct ${collectionOnProduct.productId})`,
  })
  .from(collectionOnProduct)
  .prepare()
