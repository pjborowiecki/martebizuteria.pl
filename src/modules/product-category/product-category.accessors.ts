import { and, count, eq, inArray, isNull, max, sql } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { CATEGORY_STATUS } from "~/src/modules/product-category/product-category.constants";
import { productCategory } from "~/src/modules/product-category/product-category.schema";
import type { Category } from "~/src/modules/product-category/product-category.types";

const EMPTY_LENGTH = 0;
const ZERO_COUNT = 0;

/** Admin: all categories, manual order. */
const getAdminCategoriesQuery = db.query.productCategory
  .findMany({
    orderBy: (categories, { asc, desc }) => [asc(categories.rank), desc(categories.createdAt)]
  })
  .prepare();

/** Admin: lookup by handle (any status). */
const getCategoryByHandleQuery = db.query.productCategory
  .findFirst({
    where: eq(productCategory.handle, sql.placeholder("handle")),
    with: { children: true, parent: true }
  })
  .prepare();

/** Storefront: active root categories with children, ordered by rank. */
const getStorefrontRootCategoriesQuery = db.query.productCategory
  .findMany({
    orderBy: (categories, { asc }) => [asc(categories.rank)],
    where: and(isNull(productCategory.parentId), eq(productCategory.status, CATEGORY_STATUS.ACTIVE)),
    with: { children: true }
  })
  .prepare();

/** Storefront: active category by handle. */
const getStorefrontCategoryByHandleQuery = db.query.productCategory
  .findFirst({
    where: and(eq(productCategory.handle, sql.placeholder("handle")), eq(productCategory.status, CATEGORY_STATUS.ACTIVE)),
    with: { parent: true }
  })
  .prepare();

/** Lightweight id + parentId rows for descendant category resolution. */
const getCategoryHierarchyQuery = db
  .select({
    id: productCategory.id,
    parentId: productCategory.parentId
  })
  .from(productCategory)
  .prepare();

const getCategoryStatusCountsQuery = db
  .select({
    active: sql<number>`sum(case when ${productCategory.status} = ${CATEGORY_STATUS.ACTIVE} then 1 else 0 end)`,
    draft: sql<number>`sum(case when ${productCategory.status} = ${CATEGORY_STATUS.DRAFT} then 1 else 0 end)`,
    total: sql<number>`count(*)`
  })
  .from(productCategory)
  .prepare();

async function getNextRankForParent(parentId: string | undefined): Promise<number> {
  const NO_RANK = -1;
  const RANK_STEP = 1;
  const hasParent = parentId !== undefined && parentId !== "";
  const whereClause = hasParent ? eq(productCategory.parentId, parentId) : isNull(productCategory.parentId);

  const [row] = await db
    .select({ value: max(productCategory.rank) })
    .from(productCategory)
    .where(whereClause);

  return (row?.value ?? NO_RANK) + RANK_STEP;
}

async function countChildCategories(parentIds: readonly string[]): Promise<number> {
  if (parentIds.length === EMPTY_LENGTH) {
    return ZERO_COUNT;
  }

  const [row] = await db
    .select({ value: count() })
    .from(productCategory)
    .where(inArray(productCategory.parentId, [...parentIds]));

  return row?.value ?? ZERO_COUNT;
}

function getCategoriesByIds(ids: readonly string[]): Promise<Category["select"][]> {
  if (ids.length === EMPTY_LENGTH) {
    return Promise.resolve([]);
  }

  return db
    .select()
    .from(productCategory)
    .where(inArray(productCategory.id, [...ids]));
}

async function insertCategory(values: Category["insert"]): Promise<void> {
  await db.insert(productCategory).values(values);
}

async function setCategoryRanks(updates: readonly { id: string; rank: number }[]): Promise<void> {
  if (updates.length === EMPTY_LENGTH) {
    return;
  }

  const cases = updates.map((entry) => sql`when ${productCategory.id} = ${entry.id} then ${entry.rank}`);
  const rankExpression = sql`(case ${sql.join(cases, sql.raw(" "))} end)`;

  await db
    .update(productCategory)
    .set({ rank: rankExpression })
    .where(
      inArray(
        productCategory.id,
        updates.map((entry) => entry.id)
      )
    );
}

async function deleteCategories(ids: readonly string[]): Promise<void> {
  if (ids.length === EMPTY_LENGTH) {
    return;
  }

  await db.delete(productCategory).where(inArray(productCategory.id, [...ids]));
}

async function updateCategory(id: string, values: Partial<Category["insert"]>): Promise<void> {
  await db.update(productCategory).set(values).where(eq(productCategory.id, id));
}

export const categoryAccessors = {
  countChildCategories,
  deleteCategories,
  getAdminCategoriesQuery,
  getCategoriesByIds,
  getCategoryByHandleQuery,
  getCategoryHierarchyQuery,
  getCategoryStatusCountsQuery,
  getNextRankForParent,
  getStorefrontCategoryByHandleQuery,
  getStorefrontRootCategoriesQuery,
  insertCategory,
  setCategoryRanks,
  updateCategory
};
