import { and, asc, desc, eq, inArray, max, ne, or, sql, type SQL } from "drizzle-orm";

import { runDrizzleBatch, type DrizzleBatchStatement } from "~/src/integrations/drizzle-orm/drizzle.batch";
import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import type { ListPaginationParams } from "~/src/lib/_utils/list-pagination";

import { categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema";
import { resolvePrimaryCategoryId } from "~/src/modules/category-on-product/category-on-product.utils";
import { collectionOnProduct } from "~/src/modules/collection-on-product/collection-on-product.schema";
import { inventory } from "~/src/modules/inventory/inventory.schema";
import { optionOnVariant } from "~/src/modules/option-on-variant/option-on-variant.schema";
import { productOption } from "~/src/modules/product-option/product-option.schema";
import { productVariant } from "~/src/modules/product-variant/product-variant.schema";
import {
  PRODUCT_INVENTORY_LEVEL,
  PRODUCT_LOW_STOCK_THRESHOLD,
  PRODUCT_STATUS,
  PRODUCT_STOREFRONT_LIST_LIMIT,
  type ProductInventoryLevel,
  type ProductStatus
} from "~/src/modules/product/product.constants";
import { product } from "~/src/modules/product/product.schema";
import type { Product } from "~/src/modules/product/product.types";
import type { ProductCatalogReplacePayload, ProductOrganizationReplacePayload } from "~/src/modules/product/product.utils";

const EMPTY_LENGTH = 0;
const RELATED_PRODUCTS_LIMIT = 3;

function requireSql(expression: SQL | undefined): SQL {
  if (expression === undefined) {
    throw new Error("Expected SQL filter expression");
  }

  return expression;
}

function sortProductsByIdOrder<T extends { id: string }>(items: readonly T[], orderedIds: readonly string[]): T[] {
  const orderById = new Map(orderedIds.map((id, index) => [id, index]));
  return [...items].toSorted((left, right) => (orderById.get(left.id) ?? EMPTY_LENGTH) - (orderById.get(right.id) ?? EMPTY_LENGTH));
}

export interface AdminProductsListParams extends ListPaginationParams {
  readonly categoryId?: string;
  readonly collectionId?: string;
  readonly inventoryLevel?: ProductInventoryLevel;
  readonly status?: ProductStatus;
}

/** Admin catalog list: manual rank, category/collection titles for display. */
const getAdminProductsQuery = db.query.product
  .findMany({
    orderBy: (products, { asc: ascOrder, desc: descOrder }) => [ascOrder(products.rank), descOrder(products.createdAt)],
    with: {
      attributes: {
        orderBy: (values, { asc: ascOrder }) => [ascOrder(values.rank), ascOrder(values.createdAt)],
        with: { productAttribute: { columns: { titles: true } } }
      },
      categories: { with: { productCategory: { columns: { titles: true } } } },
      collections: { with: { productCollection: { columns: { titles: true } } } }
    }
  })
  .prepare();

const getProductVariantStatsQuery = db
  .select({
    minPrice: sql<number | null>`min(${productVariant.price})`,
    productId: productVariant.productId,
    totalStock: sql<number>`coalesce(sum(${inventory.quantityAvailable}), 0)`,
    variantCount: sql<number>`count(${productVariant.id})`
  })
  .from(productVariant)
  .leftJoin(inventory, eq(inventory.variantId, productVariant.id))
  .groupBy(productVariant.productId)
  .prepare();

const getProductStatusCountsQuery = db
  .select({
    active: sql<number>`sum(case when ${product.status} = ${PRODUCT_STATUS.PUBLISHED} then 1 else 0 end)`,
    archived: sql<number>`sum(case when ${product.status} = ${PRODUCT_STATUS.ARCHIVED} then 1 else 0 end)`,
    draft: sql<number>`sum(case when ${product.status} = ${PRODUCT_STATUS.DRAFT} then 1 else 0 end)`,
    total: sql<number>`count(*)`
  })
  .from(product)
  .prepare();

const getPublishedProductIdsQuery = db
  .select({ id: product.id })
  .from(product)
  .where(eq(product.status, PRODUCT_STATUS.PUBLISHED))
  .prepare();

// NOTE: intentionally NOT a prepared statement — variable-length `IN` on D1/SQLite.
const getProductsWithInventoryByHandles = (handles: readonly string[]) =>
  db.query.product.findMany({
    where: inArray(product.handle, [...handles]),
    with: { variants: { with: { inventory: true } } }
  });

const getPublishedProductsQuery = db.query.product
  .findMany({
    limit: PRODUCT_STOREFRONT_LIST_LIMIT,
    orderBy: (products, { asc: ascOrder, desc: descOrder }) => [ascOrder(products.rank), descOrder(products.createdAt)],
    where: eq(product.status, PRODUCT_STATUS.PUBLISHED),
    with: { variants: true }
  })
  .prepare();

const getMaxRankQuery = db
  .select({ value: max(product.rank) })
  .from(product)
  .prepare();

/** Admin / checkout: any status by handle. */
const getProductByHandleQuery = db.query.product
  .findFirst({
    where: eq(product.handle, sql.placeholder("handle")),
    with: {
      attributes: {
        orderBy: (values, { asc: ascOrder }) => [ascOrder(values.rank), ascOrder(values.createdAt)]
      },
      categories: { with: { productCategory: true } },
      collections: { with: { productCollection: true } },
      images: {
        orderBy: (images, { asc: ascOrder }) => [ascOrder(images.rank), ascOrder(images.createdAt)]
      },
      options: {
        with: {
          optionOnVariants: true
        }
      },
      variants: {
        with: {
          inventory: true,
          optionOnVariants: {
            with: {
              option: true
            }
          }
        }
      }
    }
  })
  .prepare();

/** Storefront PDP: published products only. */
const getPublishedProductByHandleQuery = db.query.product
  .findFirst({
    where: and(eq(product.handle, sql.placeholder("handle")), eq(product.status, PRODUCT_STATUS.PUBLISHED)),
    with: {
      attributes: {
        orderBy: (values, { asc: ascOrder }) => [ascOrder(values.rank)],
        with: { productAttribute: true }
      },
      categories: { with: { productCategory: true } },
      collections: { with: { productCollection: true } },
      images: {
        orderBy: (images, { asc: ascOrder }) => [ascOrder(images.rank), ascOrder(images.createdAt)]
      },
      variants: true
    }
  })
  .prepare();

function totalStockSubquery() {
  return sql<number>`(
    select coalesce(sum(${inventory.quantityAvailable}), 0)
    from ${productVariant}
    left join ${inventory} on ${eq(inventory.variantId, productVariant.id)}
    where ${eq(productVariant.productId, product.id)}
  )`;
}

function buildInventoryLevelCondition(level: ProductInventoryLevel): SQL {
  const stock = totalStockSubquery();

  if (level === PRODUCT_INVENTORY_LEVEL.OUT) {
    return requireSql(and(eq(product.status, PRODUCT_STATUS.PUBLISHED), sql`${stock} <= 0`));
  }

  if (level === PRODUCT_INVENTORY_LEVEL.LOW) {
    return requireSql(
      and(eq(product.status, PRODUCT_STATUS.PUBLISHED), sql`${stock} > 0`, sql`${stock} <= ${PRODUCT_LOW_STOCK_THRESHOLD}`)
    );
  }

  return requireSql(or(ne(product.status, PRODUCT_STATUS.PUBLISHED), sql`${stock} > ${PRODUCT_LOW_STOCK_THRESHOLD}`));
}

function buildAdminProductsWhere(params: AdminProductsListParams): SQL | undefined {
  const conditions: SQL[] = [];

  if (params.status !== undefined) {
    conditions.push(eq(product.status, params.status));
  }

  if (params.inventoryLevel !== undefined) {
    conditions.push(buildInventoryLevelCondition(params.inventoryLevel));
  }

  if (params.categoryId !== undefined) {
    conditions.push(
      inArray(
        product.id,
        db.select({ id: categoryOnProduct.productId }).from(categoryOnProduct).where(eq(categoryOnProduct.categoryId, params.categoryId))
      )
    );
  }

  if (params.collectionId !== undefined) {
    conditions.push(
      inArray(
        product.id,
        db
          .select({ id: collectionOnProduct.productId })
          .from(collectionOnProduct)
          .where(eq(collectionOnProduct.collectionId, params.collectionId))
      )
    );
  }

  if (conditions.length === EMPTY_LENGTH) {
    return;
  }

  return and(...conditions);
}

async function getAdminProductsPage(params: AdminProductsListParams) {
  const whereClause = buildAdminProductsWhere(params);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(product)
    .where(whereClause);

  const idRows = await db
    .select({ id: product.id })
    .from(product)
    .where(whereClause)
    .orderBy(desc(product.updatedAt))
    .limit(params.limit)
    .offset(params.offset);

  const ids = idRows.map((row) => row.id);
  if (ids.length === EMPTY_LENGTH) {
    return { rows: [], total: countRow?.count ?? EMPTY_LENGTH };
  }

  const rows = await db.query.product.findMany({
    orderBy: (products, { desc: descOrder }) => [descOrder(products.updatedAt)],
    where: inArray(product.id, ids),
    with: {
      attributes: {
        orderBy: (values, { asc: ascOrder }) => [ascOrder(values.rank), ascOrder(values.createdAt)],
        with: { productAttribute: { columns: { titles: true } } }
      },
      categories: { with: { productCategory: { columns: { titles: true } } } },
      collections: { with: { productCollection: { columns: { titles: true } } } }
    }
  });

  return { rows, total: countRow?.count ?? EMPTY_LENGTH };
}

type PublishedProductListRow = Awaited<ReturnType<(typeof getPublishedProductsQuery)["execute"]>>[number];

async function getPublishedProductsByCategoryIds(categoryIds: readonly string[], params: ListPaginationParams) {
  if (categoryIds.length === EMPTY_LENGTH) {
    return { items: [] as PublishedProductListRow[], total: EMPTY_LENGTH };
  }

  const whereClause = and(eq(product.status, PRODUCT_STATUS.PUBLISHED), inArray(categoryOnProduct.categoryId, [...categoryIds]));

  const [countRow] = await db
    .select({ count: sql<number>`count(distinct ${product.id})` })
    .from(product)
    .innerJoin(categoryOnProduct, eq(categoryOnProduct.productId, product.id))
    .where(whereClause);

  const productIdRows = await db
    .select({ productId: product.id })
    .from(product)
    .innerJoin(categoryOnProduct, eq(categoryOnProduct.productId, product.id))
    .where(whereClause)
    .groupBy(product.id)
    .orderBy(desc(product.createdAt))
    .limit(params.limit)
    .offset(params.offset);

  const productIds = productIdRows.map((row) => row.productId);
  if (productIds.length === EMPTY_LENGTH) {
    return { items: [] as PublishedProductListRow[], total: countRow?.count ?? EMPTY_LENGTH };
  }

  const items = sortProductsByIdOrder(
    await db.query.product.findMany({
      orderBy: (products, { desc: descOrder }) => [descOrder(products.createdAt)],
      where: inArray(product.id, productIds),
      with: { variants: true }
    }),
    productIds
  );

  return { items, total: countRow?.count ?? EMPTY_LENGTH };
}

async function getPublishedProductsByCollectionId(collectionId: string, params: ListPaginationParams) {
  const whereClause = and(eq(product.status, PRODUCT_STATUS.PUBLISHED), eq(collectionOnProduct.collectionId, collectionId));

  const [countRow] = await db
    .select({ count: sql<number>`count(distinct ${product.id})` })
    .from(product)
    .innerJoin(collectionOnProduct, eq(collectionOnProduct.productId, product.id))
    .where(whereClause);

  const productIdRows = await db
    .select({
      productId: product.id,
      sortRank: sql<number>`min(${collectionOnProduct.rank})`.as("sort_rank")
    })
    .from(product)
    .innerJoin(collectionOnProduct, eq(collectionOnProduct.productId, product.id))
    .where(whereClause)
    .groupBy(product.id)
    .orderBy(asc(sql`sort_rank`), desc(product.createdAt))
    .limit(params.limit)
    .offset(params.offset);

  const productIds = productIdRows.map((row) => row.productId);
  if (productIds.length === EMPTY_LENGTH) {
    return { items: [] as PublishedProductListRow[], total: countRow?.count ?? EMPTY_LENGTH };
  }

  const items = sortProductsByIdOrder(
    await db.query.product.findMany({
      where: inArray(product.id, productIds),
      with: { variants: true }
    }),
    productIds
  );

  return { items, total: countRow?.count ?? EMPTY_LENGTH };
}

function getPublishedRelatedProducts(categoryId: string, excludeProductId: string) {
  return db.query.product.findMany({
    limit: RELATED_PRODUCTS_LIMIT,
    orderBy: (products, { desc: descOrder }) => [descOrder(products.createdAt)],
    where: and(
      eq(product.status, PRODUCT_STATUS.PUBLISHED),
      ne(product.id, excludeProductId),
      inArray(
        product.id,
        db.select({ id: categoryOnProduct.productId }).from(categoryOnProduct).where(eq(categoryOnProduct.categoryId, categoryId))
      )
    ),
    with: { variants: true }
  });
}

async function deleteProducts(ids: readonly string[]): Promise<void> {
  if (ids.length === EMPTY_LENGTH) {
    return;
  }

  await db.delete(product).where(inArray(product.id, [...ids]));
}

async function insertProduct(row: Product["insert"]): Promise<void> {
  await db.insert(product).values(row);
}

async function setProductRanks(updates: readonly { id: string; rank: number }[]): Promise<void> {
  if (updates.length === EMPTY_LENGTH) {
    return;
  }

  const ids = updates.map((entry) => entry.id);
  const cases = updates.map((entry) => sql`when ${product.id} = ${entry.id} then ${entry.rank}`);
  const rankExpression = sql`(case ${sql.join(cases, sql.raw(" "))} end)`;

  await db.update(product).set({ rank: rankExpression }).where(inArray(product.id, ids));
}

async function updateProductRow(id: string, patch: Partial<Product["insert"]>): Promise<void> {
  await db.update(product).set(patch).where(eq(product.id, id));
}

async function replaceProductCatalog(productId: string, payload: ProductCatalogReplacePayload): Promise<void> {
  const { inventoryRows, optionOnVariantRows, optionRows, variantRows } = payload;

  // D1 has no interactive transactions (`BEGIN` fails); batch keeps writes atomic.
  const statements: DrizzleBatchStatement[] = [
    db.delete(productOption).where(eq(productOption.productId, productId)),
    db.delete(productVariant).where(eq(productVariant.productId, productId))
  ];

  if (optionRows.length > EMPTY_LENGTH) {
    statements.push(db.insert(productOption).values(optionRows));
  }

  if (variantRows.length > EMPTY_LENGTH) {
    statements.push(db.insert(productVariant).values(variantRows));
  }

  if (inventoryRows.length > EMPTY_LENGTH) {
    statements.push(db.insert(inventory).values(inventoryRows));
  }

  if (optionOnVariantRows.length > EMPTY_LENGTH) {
    statements.push(db.insert(optionOnVariant).values(optionOnVariantRows));
  }

  await runDrizzleBatch(statements);
}

async function replaceProductOrganization(productId: string, payload: ProductOrganizationReplacePayload): Promise<void> {
  const { categoryRows, collectionRows } = payload;
  const primaryCategoryId = resolvePrimaryCategoryId(
    categoryRows.map((row) => ({ categoryId: row.categoryId, isPrimary: row.isPrimary ?? false }))
  );

  const statements: DrizzleBatchStatement[] = [
    db.delete(categoryOnProduct).where(eq(categoryOnProduct.productId, productId)),
    db.delete(collectionOnProduct).where(eq(collectionOnProduct.productId, productId))
  ];

  if (categoryRows.length > EMPTY_LENGTH) {
    statements.push(db.insert(categoryOnProduct).values(categoryRows));
  }

  if (collectionRows.length > EMPTY_LENGTH) {
    statements.push(db.insert(collectionOnProduct).values(collectionRows));
  }

  statements.push(
    db
      .update(product)
      .set({ primaryCategoryId: primaryCategoryId ?? undefined })
      .where(eq(product.id, productId))
  );

  await runDrizzleBatch(statements);
}

export const productAccessors = {
  deleteProducts,
  getAdminProductsPage,
  getAdminProductsQuery,
  getMaxRankQuery,
  getProductByHandleQuery,
  getProductStatusCountsQuery,
  getProductVariantStatsQuery,
  getProductsWithInventoryByHandles,
  getPublishedProductByHandleQuery,
  getPublishedProductIdsQuery,
  getPublishedProductsByCategoryIds,
  getPublishedProductsByCollectionId,
  getPublishedProductsQuery,
  getPublishedRelatedProducts,
  insertProduct,
  replaceProductCatalog,
  replaceProductOrganization,
  setProductRanks,
  updateProductRow
};
