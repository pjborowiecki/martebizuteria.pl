import { and, eq, inArray, max, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { COLLECTION_STATUS } from "~/src/modules/product-collection/product-collection.constants"
import { productCollection } from "~/src/modules/product-collection/product-collection.schema"

const handlePlaceholder = sql.placeholder("handle")

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
    where: and(eq(productCollection.handle, handlePlaceholder), eq(productCollection.status, COLLECTION_STATUS.ACTIVE)),
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

export const setCollectionRanks = async (
  updates: readonly {
    id: string
    rank: number
  }[],
): Promise<void> => {
  if (updates.length === 0) {
    return
  }

  const ids = updates.map((entry) => entry.id)
  const cases = updates.map((entry) => sql`when ${productCollection.id} = ${entry.id} then ${entry.rank}`)
  const rankExpression = sql`(case ${sql.join(cases, sql.raw(" "))} end)`
  await db
    .update(productCollection)
    .set({
      rank: rankExpression,
    })
    .where(inArray(productCollection.id, ids))
}

export const deleteCollections = async (ids: readonly string[]): Promise<void> => {
  if (ids.length === 0) {
    return
  }
  await db.delete(productCollection).where(inArray(productCollection.id, [...ids]))
}
