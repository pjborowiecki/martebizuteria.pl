import { eq, isNull, sql } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { category } from "~/src/modules/category/category.schema";
import { product } from "~/src/modules/product/product.schema";

const getRootCategoriesQuery = db.query.category
  .findMany({
    orderBy: (categories, { asc }) => [asc(categories.position)],
    where: isNull(category.parentId),
    with: { children: true }
  })
  .prepare();

const getCategoryByHandleQuery = db.query.category
  .findFirst({
    where: eq(category.handle, sql.placeholder("handle")),
    with: { children: true, parent: true }
  })
  .prepare();

const getProductsByCategoryIdQuery = db.query.product
  .findMany({
    limit: 20,
    where: eq(product.categoryId, sql.placeholder("categoryId")),
    with: { variants: true }
  })
  .prepare();

export const categoryAccessors = {
  getCategoryByHandleQuery,
  getProductsByCategoryIdQuery,
  getRootCategoriesQuery
};
