import { and, asc, desc, eq, inArray, max, ne, or, sql, type SQL } from "drizzle-orm";

import { runDrizzleBatch, type DrizzleBatchStatement } from "~/src/integrations/drizzle-orm/drizzle.batch";
import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import type { DateColumnFilterValue, NumericColumnFilterValue } from "~/src/lib/_utils/admin-column-filters";
import { buildAdminDateFilterSql, buildAdminNumericFilterSql } from "~/src/lib/_utils/admin-column-filters.server";
import { buildAdminLikePattern, buildAdminSearchOrCondition, normalizeAdminSearchTerm } from "~/src/lib/_utils/admin-search.server";
import type { ListPaginationParams } from "~/src/lib/_utils/list-pagination";

import { attributeOnProduct } from "~/src/modules/attribute-on-product/attribute-on-product.schema";
import { categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema";
import { resolvePrimaryCategoryId } from "~/src/modules/category-on-product/category-on-product.utils";
import { collectionOnProduct } from "~/src/modules/collection-on-product/collection-on-product.schema";
import { inventory } from "~/src/modules/inventory/inventory.schema";
import { optionOnVariant } from "~/src/modules/option-on-variant/option-on-variant.schema";
import { productOption } from "~/src/modules/product-option/product-option.schema";
import { productVariant } from "~/src/modules/product-variant/product-variant.schema";
import { adminProductsListSortRequiresVariantStats, type AdminProductsListSort } from "~/src/modules/product/product.admin-list-sort";
import {
  PRODUCT_INVENTORY_LEVEL,
  PRODUCT_LOW_STOCK_THRESHOLD,
  PRODUCT_STATUS,
  PRODUCT_STOREFRONT_LIST_LIMIT,
  PRODUCT_TABLE_COLUMN_ID,
  type ProductInventoryLevel,
  type ProductStatus
} from "~/src/modules/product/product.constants";
import { product } from "~/src/modules/product/product.schema";
import type { Product } from "~/src/modules/product/product.types";
import type { ProductCatalogReplacePayload, ProductOrganizationReplacePayload } from "~/src/modules/product/product.utils";

const EMPTY_LENGTH = 0;
const RELATED_PRODUCTS_LIMIT = 3;

const storefrontListVariantColumns = {
  id: true,
  price: true,
  productId: true,
  title: true
} as const;

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
  readonly createdAt?: DateColumnFilterValue;
  readonly inventoryLevel?: ProductInventoryLevel;
  readonly minPrice?: NumericColumnFilterValue;
  readonly search?: string;
  readonly sort?: AdminProductsListSort;
  readonly status?: ProductStatus;
  readonly totalStock?: NumericColumnFilterValue;
}

export type AdminProductsExportListParams = Omit<AdminProductsListParams, "limit" | "offset">;

function groupRowsByProductId<TRow extends { productId: string }>(rows: readonly TRow[]): Map<string, TRow[]> {
  const grouped = new Map<string, TRow[]>();

  for (const row of rows) {
    const existing = grouped.get(row.productId);
    if (existing === undefined) {
      grouped.set(row.productId, [row]);
    } else {
      existing.push(row);
    }
  }

  return grouped;
}

/** Admin reorder list: one product query plus batched junction loads (no nested relational fan-out). */
async function getAdminProductsCatalogList() {
  const products = await db.select().from(product).orderBy(asc(product.rank), desc(product.createdAt));

  if (products.length === EMPTY_LENGTH) {
    return [];
  }

  const productIds = products.map((row) => row.id);

  const [attributeRows, categoryRows, collectionRows] = await Promise.all([
    db.query.attributeOnProduct.findMany({
      orderBy: (values, { asc: ascOrder }) => [ascOrder(values.rank), ascOrder(values.createdAt)],
      where: inArray(attributeOnProduct.productId, productIds),
      with: { productAttribute: { columns: { titles: true } } }
    }),
    db.query.categoryOnProduct.findMany({
      where: inArray(categoryOnProduct.productId, productIds),
      with: { productCategory: { columns: { titles: true } } }
    }),
    db.query.collectionOnProduct.findMany({
      where: inArray(collectionOnProduct.productId, productIds),
      with: { productCollection: { columns: { titles: true } } }
    })
  ]);

  const attributesByProductId = groupRowsByProductId(attributeRows);
  const categoriesByProductId = groupRowsByProductId(categoryRows);
  const collectionsByProductId = groupRowsByProductId(collectionRows);

  const catalogList = [];

  for (const row of products) {
    catalogList.push({
      ...row,
      attributes: attributesByProductId.get(row.id) ?? [],
      categories: categoriesByProductId.get(row.id) ?? [],
      collections: collectionsByProductId.get(row.id) ?? []
    });
  }

  return catalogList;
}

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
    with: { variants: { columns: storefrontListVariantColumns } }
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

const getAdminProductDetailByIdQuery = db.query.product
  .findFirst({
    where: eq(product.id, sql.placeholder("id")),
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

const getLowStockPublishedProductCountQuery = db
  .select({ count: sql<number>`count(*)` })
  .from(product)
  .where(and(eq(product.status, PRODUCT_STATUS.PUBLISHED), sql`${totalStockSubquery()} between 1 and ${PRODUCT_LOW_STOCK_THRESHOLD}`))
  .prepare();

function productVariantStatsSubquery() {
  return db
    .select({
      minPrice: sql<number | null>`min(${productVariant.price})`.as("min_price"),
      productId: productVariant.productId,
      totalStock: sql<number>`coalesce(sum(${inventory.quantityAvailable}), 0)`.as("total_stock"),
      variantCount: sql<number>`count(${productVariant.id})`.as("variant_count")
    })
    .from(productVariant)
    .leftJoin(inventory, eq(inventory.variantId, productVariant.id))
    .groupBy(productVariant.productId)
    .as("product_variant_stats");
}

function adminProductsListNeedsVariantStatsJoin(params: Pick<AdminProductsListParams, "inventoryLevel" | "sort">): boolean {
  return params.inventoryLevel !== undefined || adminProductsListSortRequiresVariantStats(params.sort);
}

function buildAdminProductsOrderClauses(
  sort: AdminProductsListSort | undefined,
  variantStats: ReturnType<typeof productVariantStatsSubquery> | undefined
) {
  if (sort === undefined) {
    return [desc(product.updatedAt)];
  }

  const direction = sort.desc ? desc : asc;

  switch (sort.columnId) {
    case PRODUCT_TABLE_COLUMN_ID.title: {
      return [direction(product.handle)];
    }
    case PRODUCT_TABLE_COLUMN_ID.recordId: {
      return [direction(product.id)];
    }
    case PRODUCT_TABLE_COLUMN_ID.status: {
      return [direction(product.status)];
    }
    case PRODUCT_TABLE_COLUMN_ID.minPrice: {
      return [direction(sql`coalesce(${variantStats!.minPrice}, 0)`)];
    }
    case PRODUCT_TABLE_COLUMN_ID.stock: {
      return [direction(sql`coalesce(${variantStats!.totalStock}, 0)`)];
    }
    case PRODUCT_TABLE_COLUMN_ID.variantCount: {
      return [direction(sql`coalesce(${variantStats!.variantCount}, 0)`)];
    }
    case PRODUCT_TABLE_COLUMN_ID.createdAt: {
      return [direction(product.createdAt)];
    }
    case PRODUCT_TABLE_COLUMN_ID.editedAt: {
      return [direction(product.updatedAt)];
    }
    default: {
      return [desc(product.updatedAt)];
    }
  }
}

async function loadAdminProductRowsByIds(ids: readonly string[]) {
  if (ids.length === EMPTY_LENGTH) {
    return [];
  }

  const rows = await db.query.product.findMany({
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

  return sortProductsByIdOrder(rows, ids);
}

function buildInventoryLevelStockCondition(level: ProductInventoryLevel, totalStock: SQL<number>): SQL {
  const stock = totalStock;

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

function buildAdminProductSearchCondition(search: string | undefined): SQL | undefined {
  const normalized = normalizeAdminSearchTerm(search);
  if (normalized === undefined) {
    return undefined;
  }

  const pattern = buildAdminLikePattern(normalized);
  const textMatch = buildAdminSearchOrCondition(normalized, [
    product.handle,
    product.id,
    product.titles,
    product.subtitles,
    product.descriptions
  ]);
  const skuMatch = inArray(
    product.id,
    db
      .select({ id: productVariant.productId })
      .from(productVariant)
      .where(sql`${productVariant.sku} like ${pattern}`)
  );

  if (textMatch === undefined) {
    return skuMatch;
  }

  return or(textMatch, skuMatch);
}

type AdminProductsFilterParams = Pick<
  AdminProductsListParams,
  "categoryId" | "collectionId" | "createdAt" | "inventoryLevel" | "search" | "status"
>;

function buildAdminProductsWhere(params: AdminProductsFilterParams, options?: { readonly skipInventory?: boolean }): SQL | undefined {
  const conditions: SQL[] = [];

  const searchCondition = buildAdminProductSearchCondition(params.search);
  if (searchCondition !== undefined) {
    conditions.push(searchCondition);
  }

  if (params.status !== undefined) {
    conditions.push(eq(product.status, params.status));
  }

  if (params.createdAt !== undefined) {
    conditions.push(buildAdminDateFilterSql(sql`${product.createdAt}`, params.createdAt));
  }

  if (params.inventoryLevel !== undefined && options?.skipInventory !== true) {
    conditions.push(buildInventoryLevelStockCondition(params.inventoryLevel, sql<number>`(${totalStockSubquery()})`));
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

function selectAdminProductIds(options: {
  readonly combinedWhere: SQL | undefined;
  readonly needsVariantStatsJoin: boolean;
  readonly orderClauses: ReturnType<typeof buildAdminProductsOrderClauses>;
  readonly slice?: Pick<ListPaginationParams, "limit" | "offset">;
  readonly variantStats: ReturnType<typeof productVariantStatsSubquery>;
}) {
  const base = options.needsVariantStatsJoin
    ? db.select({ id: product.id }).from(product).leftJoin(options.variantStats, eq(options.variantStats.productId, product.id))
    : db.select({ id: product.id }).from(product);

  const ordered = base.where(options.combinedWhere).orderBy(...options.orderClauses);

  if (options.slice?.limit === undefined) {
    return ordered;
  }

  return ordered.limit(options.slice.limit).offset(options.slice.offset ?? EMPTY_LENGTH);
}

async function queryAdminProducts(
  params: AdminProductsExportListParams,
  slice?: Pick<ListPaginationParams, "limit" | "offset">
): Promise<{ readonly rows: Awaited<ReturnType<typeof loadAdminProductRowsByIds>>; readonly total: number }> {
  const variantStats = productVariantStatsSubquery();
  const needsVariantStatsJoin =
    adminProductsListNeedsVariantStatsJoin(params) || params.minPrice !== undefined || params.totalStock !== undefined;
  const whereClause = buildAdminProductsWhere(params, { skipInventory: needsVariantStatsJoin });

  let combinedWhere = whereClause;
  if (needsVariantStatsJoin) {
    const joinedStock = sql<number>`coalesce(${variantStats.totalStock}, 0)`;
    const stockCondition =
      params.inventoryLevel === undefined ? undefined : buildInventoryLevelStockCondition(params.inventoryLevel, joinedStock);
    const minPriceCondition =
      params.minPrice === undefined ? undefined : buildAdminNumericFilterSql(sql`coalesce(${variantStats.minPrice}, 0)`, params.minPrice);
    const totalStockCondition = params.totalStock === undefined ? undefined : buildAdminNumericFilterSql(joinedStock, params.totalStock);
    const joinConditions = [whereClause, stockCondition, minPriceCondition, totalStockCondition].filter(
      (condition): condition is SQL => condition !== undefined
    );
    combinedWhere = joinConditions.length === EMPTY_LENGTH ? undefined : and(...joinConditions);
  }

  const orderClauses = buildAdminProductsOrderClauses(params.sort, needsVariantStatsJoin ? variantStats : undefined);

  const countQuery = needsVariantStatsJoin
    ? db
        .select({ count: sql<number>`count(*)` })
        .from(product)
        .leftJoin(variantStats, eq(variantStats.productId, product.id))
    : db.select({ count: sql<number>`count(*)` }).from(product);

  const [[countRow], idRows] = await Promise.all([
    countQuery.where(combinedWhere),
    selectAdminProductIds({ combinedWhere, needsVariantStatsJoin, orderClauses, slice, variantStats })
  ]);
  const ids = idRows.map((row) => row.id);
  const rows = await loadAdminProductRowsByIds(ids);

  return { rows, total: countRow?.count ?? EMPTY_LENGTH };
}

function getAdminProductsPage(params: AdminProductsListParams) {
  return queryAdminProducts(params, { limit: params.limit, offset: params.offset });
}

async function getAdminProductsFilteredList(params: AdminProductsExportListParams) {
  const { rows } = await queryAdminProducts(params);
  return rows;
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
    .orderBy(asc(product.rank), desc(product.createdAt))
    .limit(params.limit)
    .offset(params.offset);

  const productIds = productIdRows.map((row) => row.productId);
  if (productIds.length === EMPTY_LENGTH) {
    return { items: [] as PublishedProductListRow[], total: countRow?.count ?? EMPTY_LENGTH };
  }

  const items = sortProductsByIdOrder(
    await db.query.product.findMany({
      where: inArray(product.id, productIds),
      with: { variants: { columns: storefrontListVariantColumns } }
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
      with: { variants: { columns: storefrontListVariantColumns } }
    }),
    productIds
  );

  return { items, total: countRow?.count ?? EMPTY_LENGTH };
}

function getPublishedRelatedProducts(categoryId: string, excludeProductId: string) {
  return db.query.product.findMany({
    limit: RELATED_PRODUCTS_LIMIT,
    orderBy: (products, { asc: ascOrder, desc: descOrder }) => [ascOrder(products.rank), descOrder(products.createdAt)],
    where: and(
      eq(product.status, PRODUCT_STATUS.PUBLISHED),
      ne(product.id, excludeProductId),
      inArray(
        product.id,
        db.select({ id: categoryOnProduct.productId }).from(categoryOnProduct).where(eq(categoryOnProduct.categoryId, categoryId))
      )
    ),
    with: { variants: { columns: storefrontListVariantColumns } }
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
  getAdminProductDetailByIdQuery,
  getAdminProductsCatalogList,
  getAdminProductsFilteredList,
  getAdminProductsPage,
  getLowStockPublishedProductCountQuery,
  getMaxRankQuery,
  getProductByHandleQuery,
  getProductStatusCountsQuery,
  getProductVariantStatsQuery,
  getProductsWithInventoryByHandles,
  getPublishedProductByHandleQuery,
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
