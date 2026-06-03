import { and, count, eq, inArray, isNull, max, sql } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { CATEGORY_STATUS } from "~/src/modules/category/category.constants";
import { category } from "~/src/modules/category/category.schema";
import type { Category } from "~/src/modules/category/category.types";
import { product } from "~/src/modules/product/product.schema";

const EMPTY_LENGTH = 0;
const ZERO_COUNT = 0;

/** Admin: all categories, manual order. */
const getAdminCategoriesQuery = db.query.category
  .findMany({
    orderBy: (categories, { asc, desc }) => [asc(categories.rank), desc(categories.createdAt)]
  })
  .prepare();

/** Admin: lookup by handle (any status). */
const getCategoryByHandleQuery = db.query.category
  .findFirst({
    where: eq(category.handle, sql.placeholder("handle")),
    with: { children: true, parent: true }
  })
  .prepare();

type CategoryWithChildren = Category["select"] & {
  children?: Category["select"][];
};

function withActiveSortedChildren(root: CategoryWithChildren): Category["select"] {
  const activeChildren = (root.children ?? [])
    .filter((child) => child.status === CATEGORY_STATUS.ACTIVE)
    .toSorted((left, right) => left.rank - right.rank);

  return { ...root, children: activeChildren } as Category["select"];
}

/** Storefront: active root categories with active children, ordered by rank. */
async function getStorefrontRootCategories(): Promise<Category["select"][]> {
  const roots = await db.query.category.findMany({
    orderBy: (categories, { asc }) => [asc(categories.rank)],
    where: and(isNull(category.parentId), eq(category.status, CATEGORY_STATUS.ACTIVE)),
    with: { children: true }
  });

  return roots.map((root) => withActiveSortedChildren(root));
}

/** Storefront: active category by handle. */
const getStorefrontCategoryByHandleQuery = db.query.category
  .findFirst({
    where: and(eq(category.handle, sql.placeholder("handle")), eq(category.status, CATEGORY_STATUS.ACTIVE)),
    with: { parent: true }
  })
  .prepare();

const getProductCountsQuery = db
  .select({ categoryId: product.categoryId, count: sql<number>`count(*)` })
  .from(product)
  .groupBy(product.categoryId)
  .prepare();

async function getNextRankForParent(parentId: string | undefined): Promise<number> {
  const NO_RANK = -1;
  const RANK_STEP = 1;
  const hasParent = parentId !== undefined && parentId !== "";
  const whereClause = hasParent ? eq(category.parentId, parentId) : isNull(category.parentId);

  const [row] = await db
    .select({ value: max(category.rank) })
    .from(category)
    .where(whereClause);

  return (row?.value ?? NO_RANK) + RANK_STEP;
}

const getCategoryStatusCountsQuery = db
  .select({
    active: sql<number>`sum(case when ${category.status} = ${CATEGORY_STATUS.ACTIVE} then 1 else 0 end)`,
    draft: sql<number>`sum(case when ${category.status} = ${CATEGORY_STATUS.DRAFT} then 1 else 0 end)`,
    total: sql<number>`count(*)`
  })
  .from(category)
  .prepare();

const getCategoryProductTotalQuery = db
  .select({ value: sql<number>`count(*)` })
  .from(product)
  .prepare();

async function countChildCategories(parentIds: readonly string[]): Promise<number> {
  if (parentIds.length === EMPTY_LENGTH) {
    return ZERO_COUNT;
  }

  const [row] = await db
    .select({ value: count() })
    .from(category)
    .where(inArray(category.parentId, [...parentIds]));

  return row?.value ?? ZERO_COUNT;
}

async function countProductsForCategories(categoryIds: readonly string[]): Promise<number> {
  if (categoryIds.length === EMPTY_LENGTH) {
    return ZERO_COUNT;
  }

  const [row] = await db
    .select({ value: count() })
    .from(product)
    .where(inArray(product.categoryId, [...categoryIds]));

  return row?.value ?? ZERO_COUNT;
}

function getCategoriesByIds(ids: readonly string[]): Promise<Category["select"][]> {
  if (ids.length === EMPTY_LENGTH) {
    return Promise.resolve([]);
  }

  return db
    .select()
    .from(category)
    .where(inArray(category.id, [...ids]));
}

async function insertCategory(values: Category["insert"]): Promise<void> {
  await db.insert(category).values(values);
}

/** Bulk-rewrites ranks in a single `UPDATE ... CASE` statement (one round-trip). */
async function setCategoryRanks(updates: readonly { id: string; rank: number }[]): Promise<void> {
  if (updates.length === EMPTY_LENGTH) {
    return;
  }

  const cases = updates.map((entry) => sql`when ${category.id} = ${entry.id} then ${entry.rank}`);
  const rankExpression = sql`(case ${sql.join(cases, sql.raw(" "))} end)`;

  await db
    .update(category)
    .set({ rank: rankExpression })
    .where(
      inArray(
        category.id,
        updates.map((entry) => entry.id)
      )
    );
}

async function deleteCategories(ids: readonly string[]): Promise<void> {
  if (ids.length === EMPTY_LENGTH) {
    return;
  }

  await db.delete(category).where(inArray(category.id, [...ids]));
}

async function updateCategory(id: string, values: Partial<Category["insert"]>): Promise<void> {
  await db.update(category).set(values).where(eq(category.id, id));
}

export const categoryAccessors = {
  countChildCategories,
  countProductsForCategories,
  deleteCategories,
  getAdminCategoriesQuery,
  getCategoriesByIds,
  getCategoryByHandleQuery,
  getCategoryProductTotalQuery,
  getCategoryStatusCountsQuery,
  getNextRankForParent,
  getProductCountsQuery,
  getStorefrontCategoryByHandleQuery,
  getStorefrontRootCategories,
  insertCategory,
  setCategoryRanks,
  updateCategory
};
