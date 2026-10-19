import { type Placeholder, and, eq, max, sql } from "drizzle-orm"

import { type RankUpdate, chunkRankUpdates, runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { inJsonList } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { COLLECTION_STATUS } from "~/src/modules/product-collection/product-collection.constants"
import { productCollection } from "~/src/modules/product-collection/product-collection.schema"

const handlePlaceholder = sql.placeholder("handle")

export const storefrontCollectionByHandleWhere = (handle: string | Placeholder) =>
  and(eq(productCollection.handle, handle), eq(productCollection.status, COLLECTION_STATUS.ACTIVE))

export const getAdminCollectionsQuery = db.query.productCollection
  .findMany({
    orderBy: (collections, { asc, desc }) => [asc(collections.rank), desc(collections.createdAt)],
  })
  .prepare()

export const getCollectionByHandleQuery = db.query.productCollection
  .findFirst({
    where: eq(productCollection.handle, handlePlaceholder),
  })
  .prepare()

export const getStorefrontCollectionsQuery = db.query.productCollection
  .findMany({
    orderBy: (collections, { asc }) => [asc(collections.rank)],
    where: eq(productCollection.status, COLLECTION_STATUS.ACTIVE),
  })
  .prepare()

export const getStorefrontCollectionByHandleQuery = db.query.productCollection
  .findFirst({
    columns: { descriptions: true, id: true, titles: true },
    where: storefrontCollectionByHandleWhere(handlePlaceholder),
  })
  .prepare()

export const getMaxRankQuery = db
  .select({
    value: max(productCollection.rank),
  })
  .from(productCollection)
  .prepare()

export const getCollectionStatusCountsQuery = db
  .select({
    active: sql<number>`sum(case when ${productCollection.status} = ${COLLECTION_STATUS.ACTIVE} then 1 else 0 end)`,
    draft: sql<number>`sum(case when ${productCollection.status} = ${COLLECTION_STATUS.DRAFT} then 1 else 0 end)`,
    total: sql<number>`count(*)`,
  })
  .from(productCollection)
  .prepare()

export const setCollectionRanks = async (updates: readonly RankUpdate[]): Promise<void> => {
  await runDrizzleBatch(
    chunkRankUpdates(productCollection.id, updates).map(({ ids, rank }) =>
      db.update(productCollection).set({ rank }).where(inJsonList(productCollection.id, ids)),
    ),
  )
}

export const deleteCollections = async (ids: readonly string[]): Promise<void> => {
  if (ids.length === 0) {
    return
  }
  await db.delete(productCollection).where(inJsonList(productCollection.id, ids))
}
