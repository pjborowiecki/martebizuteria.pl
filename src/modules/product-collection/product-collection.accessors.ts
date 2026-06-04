import { and, eq, inArray, max, sql } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { COLLECTION_STATUS } from "~/src/modules/product-collection/product-collection.constants";
import { productCollection } from "~/src/modules/product-collection/product-collection.schema";
import type { Collection } from "~/src/modules/product-collection/product-collection.types";

const EMPTY_LENGTH = 0;

/** Admin: all collections, manual order. */
const getAdminCollectionsQuery = db.query.productCollection
  .findMany({
    orderBy: (collections, { asc, desc }) => [asc(collections.rank), desc(collections.createdAt)]
  })
  .prepare();

/** Admin: lookup by handle (any status). */
const getCollectionByHandleQuery = db.query.productCollection
  .findFirst({
    where: eq(productCollection.handle, sql.placeholder("handle"))
  })
  .prepare();

/** Storefront: active collections, manual order. */
const getStorefrontCollectionsQuery = db.query.productCollection
  .findMany({
    orderBy: (collections, { asc }) => [asc(collections.rank)],
    where: eq(productCollection.status, COLLECTION_STATUS.ACTIVE)
  })
  .prepare();

/** Storefront: active collection by handle. */
const getStorefrontCollectionByHandleQuery = db.query.productCollection
  .findFirst({
    where: and(eq(productCollection.handle, sql.placeholder("handle")), eq(productCollection.status, COLLECTION_STATUS.ACTIVE))
  })
  .prepare();

const getMaxRankQuery = db
  .select({ value: max(productCollection.rank) })
  .from(productCollection)
  .prepare();

const getCollectionStatusCountsQuery = db
  .select({
    active: sql<number>`sum(case when ${productCollection.status} = ${COLLECTION_STATUS.ACTIVE} then 1 else 0 end)`,
    draft: sql<number>`sum(case when ${productCollection.status} = ${COLLECTION_STATUS.DRAFT} then 1 else 0 end)`,
    total: sql<number>`count(*)`
  })
  .from(productCollection)
  .prepare();

async function insertCollection(values: Collection["insert"]): Promise<void> {
  await db.insert(productCollection).values(values);
}

async function setCollectionRanks(updates: readonly { id: string; rank: number }[]): Promise<void> {
  if (updates.length === EMPTY_LENGTH) {
    return;
  }

  const ids = updates.map((entry) => entry.id);
  const cases = updates.map((entry) => sql`when ${productCollection.id} = ${entry.id} then ${entry.rank}`);
  const rankExpression = sql`(case ${sql.join(cases, sql.raw(" "))} end)`;

  await db.update(productCollection).set({ rank: rankExpression }).where(inArray(productCollection.id, ids));
}

async function deleteCollections(ids: readonly string[]): Promise<void> {
  if (ids.length === EMPTY_LENGTH) {
    return;
  }

  await db.delete(productCollection).where(inArray(productCollection.id, [...ids]));
}

async function updateCollection(id: string, values: Partial<Collection["insert"]>): Promise<void> {
  await db.update(productCollection).set(values).where(eq(productCollection.id, id));
}

export const collectionAccessors = {
  deleteCollections,
  getAdminCollectionsQuery,
  getCollectionByHandleQuery,
  getCollectionStatusCountsQuery,
  getMaxRankQuery,
  getStorefrontCollectionByHandleQuery,
  getStorefrontCollectionsQuery,
  insertCollection,
  setCollectionRanks,
  updateCollection
};
