import { count, inArray, sql } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema";

const EMPTY_LENGTH = 0;
const ZERO_COUNT = 0;

const getProductCountsQuery = db
  .select({ categoryId: categoryOnProduct.categoryId, count: sql<number>`count(*)` })
  .from(categoryOnProduct)
  .groupBy(categoryOnProduct.categoryId)
  .prepare();

const getCategoryProductTotalQuery = db
  .select({ value: sql<number>`count(distinct ${categoryOnProduct.productId})` })
  .from(categoryOnProduct)
  .prepare();

async function countProductsForCategories(categoryIds: readonly string[]): Promise<number> {
  if (categoryIds.length === EMPTY_LENGTH) {
    return ZERO_COUNT;
  }

  const [row] = await db
    .select({ value: count() })
    .from(categoryOnProduct)
    .where(inArray(categoryOnProduct.categoryId, [...categoryIds]));

  return row?.value ?? ZERO_COUNT;
}

export const categoryOnProductAccessors = {
  countProductsForCategories,
  getCategoryProductTotalQuery,
  getProductCountsQuery
};
