import { eq, inArray, sql } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { product } from "~/src/modules/product/product.schema";

// NOTE: this is intentionally NOT a prepared statement. A variable-length `IN`
// list cannot be expressed with a single bound placeholder on D1/SQLite — a
// prepared `inArray(col, sql.placeholder(...))` emits the invalid `handle in ?`
// and fails at runtime. Building the query per call lets Drizzle expand the
// array into `handle in (?, ?, …)` correctly.
const getProductsWithInventoryByHandles = (handles: readonly string[]) =>
  db.query.product.findMany({
    where: inArray(product.handle, [...handles]),
    with: { variants: { with: { inventory: true } } }
  });

const getPublishedProductsQuery = db.query.product
  .findMany({
    limit: 20,
    orderBy: (products, { desc }) => [desc(products.createdAt)],
    where: eq(product.status, "published"),
    with: { variants: true }
  })
  .prepare();

const getProductByHandleQuery = db.query.product
  .findFirst({
    where: eq(product.handle, sql.placeholder("handle")),
    with: { category: true, collection: true, variants: true }
  })
  .prepare();

const getRelatedProductsQuery = db.query.product
  .findMany({
    limit: 3,
    orderBy: (products, { desc }) => [desc(products.createdAt)],
    where: eq(product.categoryId, sql.placeholder("categoryId")),
    with: { variants: true }
  })
  .prepare();

export const productAccessors = {
  getProductByHandleQuery,
  getProductsWithInventoryByHandles,
  getPublishedProductsQuery,
  getRelatedProductsQuery
};
