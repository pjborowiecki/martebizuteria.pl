import { and, count, eq, inArray, isNull, max, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { CATEGORY_STATUS } from "~/src/modules/product-category/product-category.constants"
import { productCategory } from "~/src/modules/product-category/product-category.schema"
import { type Category } from "~/src/modules/product-category/product-category.types"

const handlePlaceholder = sql.placeholder("handle")

/** Admin: all categories, manual order. */
export const getAdminCategoriesQuery = db.query.productCategory
  .findMany({
    orderBy: (categories, { asc, desc }) => [asc(categories.rank), desc(categories.createdAt)],
  })
  .prepare()

/** Admin: lookup by handle (any status). */
export const getCategoryByHandleQuery = db.query.productCategory
  .findFirst({
    where: eq(productCategory.handle, handlePlaceholder),
    with: { children: true, parent: true },
  })
  .prepare()

/** Storefront: active root categories with children, ordered by rank. */
export const getStorefrontRootCategoriesQuery = db.query.productCategory
  .findMany({
    orderBy: (categories, { asc }) => [asc(categories.rank)],
    where: and(isNull(productCategory.parentId), eq(productCategory.status, CATEGORY_STATUS.ACTIVE)),
    with: { children: true },
  })
  .prepare()

/** Storefront: active category by handle. */
export const getStorefrontCategoryByHandleQuery = db.query.productCategory
  .findFirst({
    where: and(eq(productCategory.handle, handlePlaceholder), eq(productCategory.status, CATEGORY_STATUS.ACTIVE)),
    with: { parent: true },
  })
  .prepare()

/** Lightweight id + parentId rows for descendant category resolution. */
export const getCategoryHierarchyQuery = db
  .select({
    id: productCategory.id,
    parentId: productCategory.parentId,
  })
  .from(productCategory)
  .prepare()

export const getCategoryStatusCountsQuery = db
  .select({
    active: sql<number>`sum(case when ${productCategory.status} = ${CATEGORY_STATUS.ACTIVE} then 1 else 0 end)`,
    draft: sql<number>`sum(case when ${productCategory.status} = ${CATEGORY_STATUS.DRAFT} then 1 else 0 end)`,
    total: sql<number>`count(*)`,
  })
  .from(productCategory)
  .prepare()

export const getNextRankForParent = async (parentId: string | undefined): Promise<number> => {
  const NO_RANK = -1

  const hasParent = parentId !== undefined && parentId !== ""
  const whereClause = hasParent ? eq(productCategory.parentId, parentId) : isNull(productCategory.parentId)
  const [row] = await db
    .select({ value: max(productCategory.rank) })
    .from(productCategory)
    .where(whereClause)
  return (row?.value ?? NO_RANK) + 1
}

export const countChildCategories = async (parentIds: readonly string[]): Promise<number> => {
  if (parentIds.length === 0) {
    return 0
  }
  const [row] = await db
    .select({ value: count() })
    .from(productCategory)
    .where(inArray(productCategory.parentId, [...parentIds]))
  return row?.value ?? 0
}

export const getCategoriesByIds = (ids: readonly string[]): Promise<Category["select"][]> => {
  if (ids.length === 0) {
    return Promise.resolve([])
  }
  return db
    .select()
    .from(productCategory)
    .where(inArray(productCategory.id, [...ids]))
}

export const setCategoryRanks = async (
  updates: readonly {
    id: string
    rank: number
  }[],
): Promise<void> => {
  if (updates.length === 0) {
    return
  }
  const cases = updates.map((entry) => sql`when ${productCategory.id} = ${entry.id} then ${entry.rank}`)
  const rankExpression = sql`(case ${sql.join(cases, sql.raw(" "))} end)`
  await db
    .update(productCategory)
    .set({ rank: rankExpression })
    .where(
      inArray(
        productCategory.id,
        updates.map((entry) => entry.id),
      ),
    )
}

export const deleteCategories = async (ids: readonly string[]): Promise<void> => {
  if (ids.length === 0) {
    return
  }
  await db.delete(productCategory).where(inArray(productCategory.id, [...ids]))
}
