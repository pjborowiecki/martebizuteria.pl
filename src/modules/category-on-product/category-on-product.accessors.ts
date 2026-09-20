import { count, inArray, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema"
export const countProductsForCategories = async (categoryIds: readonly string[]): Promise<number> => {
  if (categoryIds.length === 0) {
    return 0
  }
  const [row] = await db
    .select({
      value: count(),
    })
    .from(categoryOnProduct)
    .where(inArray(categoryOnProduct.categoryId, [...categoryIds]))
  return row?.value ?? 0
}
export const getProductCountsQuery = db
  .select({
    categoryId: categoryOnProduct.categoryId,
    count: sql<number>`count(*)`,
  })
  .from(categoryOnProduct)
  .groupBy(categoryOnProduct.categoryId)
  .prepare()
export const getCategoryProductTotalQuery = db
  .select({
    value: sql<number>`count(distinct ${categoryOnProduct.productId})`,
  })
  .from(categoryOnProduct)
  .prepare()
