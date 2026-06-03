import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { PRODUCT_STATUS, PRODUCT_STOREFRONT_LIST_LIMIT } from "~/src/modules/product/product.constants";
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
    limit: PRODUCT_STOREFRONT_LIST_LIMIT,
    orderBy: (products, { desc }) => [desc(products.createdAt)],
    where: eq(product.status, PRODUCT_STATUS.PUBLISHED),
    with: { variants: true }
  })
  .prepare();

/** Admin / checkout: any status by handle. */
const getProductByHandleQuery = db.query.product
  .findFirst({
    where: eq(product.handle, sql.placeholder("handle")),
    with: { category: true, collection: true, variants: true }
  })
  .prepare();

/** Storefront PDP: published products only. */
const getPublishedProductByHandleQuery = db.query.product
  .findFirst({
    where: and(eq(product.handle, sql.placeholder("handle")), eq(product.status, PRODUCT_STATUS.PUBLISHED)),
    with: { category: true, collection: true, variants: true }
  })
  .prepare();

const getPublishedProductsByCategoryIdQuery = db.query.product
  .findMany({
    limit: PRODUCT_STOREFRONT_LIST_LIMIT,
    orderBy: (products, { desc }) => [desc(products.createdAt)],
    where: and(eq(product.categoryId, sql.placeholder("categoryId")), eq(product.status, PRODUCT_STATUS.PUBLISHED)),
    with: { variants: true }
  })
  .prepare();

const getPublishedProductsByCollectionIdQuery = db.query.product
  .findMany({
    limit: PRODUCT_STOREFRONT_LIST_LIMIT,
    orderBy: (products, { desc }) => [desc(products.createdAt)],
    where: and(eq(product.collectionId, sql.placeholder("collectionId")), eq(product.status, PRODUCT_STATUS.PUBLISHED)),
    with: { variants: true }
  })
  .prepare();

const getPublishedRelatedProductsQuery = db.query.product
  .findMany({
    limit: 3,
    orderBy: (products, { desc }) => [desc(products.createdAt)],
    where: and(eq(product.categoryId, sql.placeholder("categoryId")), eq(product.status, PRODUCT_STATUS.PUBLISHED)),
    with: { variants: true }
  })
  .prepare();

export const productAccessors = {
  getProductByHandleQuery,
  getProductsWithInventoryByHandles,
  getPublishedProductByHandleQuery,
  getPublishedProductsByCategoryIdQuery,
  getPublishedProductsByCollectionIdQuery,
  getPublishedProductsQuery,
  getPublishedRelatedProductsQuery
};
