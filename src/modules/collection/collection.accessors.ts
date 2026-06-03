import { and, count, eq, inArray, isNotNull, max, sql } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { COLLECTION_STATUS } from "~/src/modules/collection/collection.constants";
import { collection } from "~/src/modules/collection/collection.schema";
import type { Collection } from "~/src/modules/collection/collection.types";
import { product } from "~/src/modules/product/product.schema";

const EMPTY_LENGTH = 0;
const ZERO_COUNT = 0;

/** Admin: all collections, manual order. */
const getAdminCollectionsQuery = db.query.collection
  .findMany({
    orderBy: (collections, { asc, desc }) => [asc(collections.rank), desc(collections.createdAt)]
  })
  .prepare();

/** Admin: lookup by handle (any status). */
const getCollectionByHandleQuery = db.query.collection
  .findFirst({
    where: eq(collection.handle, sql.placeholder("handle"))
  })
  .prepare();

/** Storefront: active collections, manual order. */
const getStorefrontCollectionsQuery = db.query.collection
  .findMany({
    orderBy: (collections, { asc }) => [asc(collections.rank)],
    where: eq(collection.status, COLLECTION_STATUS.ACTIVE)
  })
  .prepare();

/** Storefront: active collection by handle. */
const getStorefrontCollectionByHandleQuery = db.query.collection
  .findFirst({
    where: and(eq(collection.handle, sql.placeholder("handle")), eq(collection.status, COLLECTION_STATUS.ACTIVE))
  })
  .prepare();

const getProductCountsQuery = db
  .select({ collectionId: product.collectionId, count: sql<number>`count(*)` })
  .from(product)
  .groupBy(product.collectionId)
  .prepare();

const getMaxRankQuery = db
  .select({ value: max(collection.rank) })
  .from(collection)
  .prepare();

const getCollectionStatusCountsQuery = db
  .select({
    active: sql<number>`sum(case when ${collection.status} = ${COLLECTION_STATUS.ACTIVE} then 1 else 0 end)`,
    draft: sql<number>`sum(case when ${collection.status} = ${COLLECTION_STATUS.DRAFT} then 1 else 0 end)`,
    total: sql<number>`count(*)`
  })
  .from(collection)
  .prepare();

const getCollectionProductTotalQuery = db
  .select({ value: sql<number>`count(*)` })
  .from(product)
  .where(isNotNull(product.collectionId))
  .prepare();

async function countProductsForCollections(collectionIds: readonly string[]): Promise<number> {
  if (collectionIds.length === EMPTY_LENGTH) {
    return ZERO_COUNT;
  }

  const [row] = await db
    .select({ value: count() })
    .from(product)
    .where(inArray(product.collectionId, [...collectionIds]));

  return row?.value ?? ZERO_COUNT;
}

async function insertCollection(values: Collection["insert"]): Promise<void> {
  await db.insert(collection).values(values);
}

async function setCollectionRanks(updates: readonly { id: string; rank: number }[]): Promise<void> {
  if (updates.length === EMPTY_LENGTH) {
    return;
  }

  const ids = updates.map((entry) => entry.id);
  const cases = updates.map((entry) => sql`when ${collection.id} = ${entry.id} then ${entry.rank}`);
  const rankExpression = sql`(case ${sql.join(cases, sql.raw(" "))} end)`;

  await db.update(collection).set({ rank: rankExpression }).where(inArray(collection.id, ids));
}

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
  countProductsForCollections,
  deleteCollections,
  getAdminCollectionsQuery,
  getCollectionByHandleQuery,
  getCollectionProductTotalQuery,
  getCollectionStatusCountsQuery,
  getMaxRankQuery,
  getProductCountsQuery,
  getStorefrontCollectionByHandleQuery,
  getStorefrontCollectionsQuery,
  insertCollection,
  setCollectionRanks,
  updateCollection
};
