import { eq, inArray, isNotNull, max, sql } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { COLLECTION_STATUS } from "~/src/modules/collection/collection.constants";
import { collection } from "~/src/modules/collection/collection.schema";
import type { Collection } from "~/src/modules/collection/collection.types";
import { product } from "~/src/modules/product/product.schema";

const EMPTY_LENGTH = 0;

const getCollectionsQuery = db.query.collection
  .findMany({
    orderBy: (collections, { asc, desc }) => [asc(collections.rank), desc(collections.createdAt)]
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

/** One grouped row per collection with its product count; avoids an N+1 per row. */
const getProductCountsQuery = db
  .select({ collectionId: product.collectionId, count: sql<number>`count(*)` })
  .from(product)
  .groupBy(product.collectionId)
  .prepare();

/** Highest rank currently in use, so a new collection can be appended to the end. */
const getMaxRankQuery = db
  .select({ value: max(collection.rank) })
  .from(collection)
  .prepare();

/** One row of aggregate counts: total collections plus a breakdown by status. */
const getCollectionStatusCountsQuery = db
  .select({
    active: sql<number>`sum(case when ${collection.status} = ${COLLECTION_STATUS.ACTIVE} then 1 else 0 end)`,
    draft: sql<number>`sum(case when ${collection.status} = ${COLLECTION_STATUS.DRAFT} then 1 else 0 end)`,
    total: sql<number>`count(*)`
  })
  .from(collection)
  .prepare();

/** Total number of products assigned to any collection (used for the average). */
const getCollectionProductTotalQuery = db
  .select({ value: sql<number>`count(*)` })
  .from(product)
  .where(isNotNull(product.collectionId))
  .prepare();

async function insertCollection(values: Collection["insert"]): Promise<void> {
  await db.insert(collection).values(values);
}

/** Bulk-rewrites ranks in a single `UPDATE ... CASE` statement (one round-trip). */
async function setCollectionRanks(updates: readonly { id: string; rank: number }[]): Promise<void> {
  if (updates.length === EMPTY_LENGTH) {
    return;
  }

  const ids = updates.map((entry) => entry.id);
  const cases = updates.map((entry) => sql`when ${collection.id} = ${entry.id} then ${entry.rank}`);
  const rankExpression = sql`(case ${sql.join(cases, sql.raw(" "))} end)`;

  await db.update(collection).set({ rank: rankExpression }).where(inArray(collection.id, ids));
}

/** Removes every collection whose id is in `ids` in a single statement. */
async function deleteCollections(ids: readonly string[]): Promise<void> {
  if (ids.length === EMPTY_LENGTH) {
    return;
  }

  await db.delete(collection).where(inArray(collection.id, [...ids]));
}

async function updateCollection(id: string, values: Partial<Collection["insert"]>): Promise<void> {
  await db.update(collection).set(values).where(eq(collection.id, id));
}

export const collectionAccessors = {
  deleteCollections,
  getCollectionByHandleQuery,
  getCollectionProductTotalQuery,
  getCollectionStatusCountsQuery,
  getCollectionsQuery,
  getMaxRankQuery,
  getProductCountsQuery,
  getProductsByCollectionIdQuery,
  insertCollection,
  setCollectionRanks,
  updateCollection
};
