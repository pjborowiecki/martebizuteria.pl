import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import type { ListPaginationParams } from "~/src/lib/_utils/list-pagination";

import { categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema";
import { collectionOnProduct } from "~/src/modules/collection-on-product/collection-on-product.schema";
import { inventory } from "~/src/modules/inventory/inventory.schema";
import { productVariant } from "~/src/modules/product-variant/product-variant.schema";
import { buildAdminProductSearchCondition } from "~/src/modules/product/product.admin-list-search.server";
import { PRODUCT_STATUS } from "~/src/modules/product/product.constants";
import { product } from "~/src/modules/product/product.schema";
import { STOREFRONT_PRODUCTS_SORT, type StorefrontProductsSort } from "~/src/modules/product/product.storefront-catalog";

const EMPTY_LENGTH = 0;
const ZERO_AVAILABLE_STOCK = 0;
const COALESCE_ZERO = 0;

const storefrontListVariantColumns = {
  id: true,
  price: true,
  productId: true,
  title: true
} as const;

function totalStockSubquery() {
  return sql<number>`(
    select coalesce(sum("inventory"."quantity_available"), 0)
    from "product_variant"
    left join "inventory" on "inventory"."variant_id" = "product_variant"."id"
    where "product_variant"."product_id" = ${product.id}
  )`;
}

function publishedProductHasAvailableStockCondition(): SQL {
  return sql`(${totalStockSubquery()}) > ${ZERO_AVAILABLE_STOCK}`;
}

function publishedInStockWhere(...extraConditions: (SQL | undefined)[]): SQL {
  const conditions = [
    eq(product.status, PRODUCT_STATUS.PUBLISHED),
    publishedProductHasAvailableStockCondition(),
    ...extraConditions
  ].filter((condition): condition is SQL => condition !== undefined);

  return and(...conditions)!;
}

function sortProductsByIdOrder<T extends { id: string }>(items: readonly T[], orderedIds: readonly string[]): T[] {
  const orderById = new Map(orderedIds.map((id, index) => [id, index]));
  return [...items].toSorted((left, right) => (orderById.get(left.id) ?? EMPTY_LENGTH) - (orderById.get(right.id) ?? EMPTY_LENGTH));
}

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

export interface StorefrontPublishedProductsParams extends ListPaginationParams {
  readonly categoryIds?: readonly string[];
  readonly collectionId?: string;
  readonly maxPriceCents?: number;
  readonly minPriceCents?: number;
  readonly searchTerm?: string;
  readonly sort?: StorefrontProductsSort;
}

function storefrontProductsNeedsVariantStatsJoin(
  params: Pick<StorefrontPublishedProductsParams, "maxPriceCents" | "minPriceCents" | "sort">
): boolean {
  return (
    params.minPriceCents !== undefined ||
    params.maxPriceCents !== undefined ||
    params.sort === STOREFRONT_PRODUCTS_SORT.PRICE_ASC ||
    params.sort === STOREFRONT_PRODUCTS_SORT.PRICE_DESC
  );
}

function buildStorefrontProductsScopeConditions(params: Pick<StorefrontPublishedProductsParams, "categoryIds" | "collectionId">): SQL[] {
  const conditions: SQL[] = [];

  if (params.categoryIds !== undefined && params.categoryIds.length > EMPTY_LENGTH) {
    conditions.push(
      inArray(
        product.id,
        db
          .select({ id: categoryOnProduct.productId })
          .from(categoryOnProduct)
          .where(inArray(categoryOnProduct.categoryId, [...params.categoryIds]))
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

  return conditions;
}

function buildStorefrontProductsOrderClauses(
  sort: StorefrontProductsSort | undefined,
  variantStats: ReturnType<typeof productVariantStatsSubquery> | undefined
) {
  const resolvedSort = sort ?? STOREFRONT_PRODUCTS_SORT.RANK;

  switch (resolvedSort) {
    case STOREFRONT_PRODUCTS_SORT.PRICE_ASC: {
      return [asc(sql`coalesce(${variantStats!.minPrice}, ${COALESCE_ZERO})`), asc(product.rank), desc(product.createdAt)];
    }
    case STOREFRONT_PRODUCTS_SORT.PRICE_DESC: {
      return [desc(sql`coalesce(${variantStats!.minPrice}, ${COALESCE_ZERO})`), asc(product.rank), desc(product.createdAt)];
    }
    case STOREFRONT_PRODUCTS_SORT.NEWEST: {
      return [desc(product.createdAt), asc(product.rank)];
    }
    case STOREFRONT_PRODUCTS_SORT.RANK: {
      return [asc(product.rank), desc(product.createdAt)];
    }
  }
}

interface StorefrontVariantJoinContext {
  readonly needsVariantJoin: boolean;
  readonly stockWhere: SQL;
  readonly variantStats: ReturnType<typeof productVariantStatsSubquery>;
}

function buildStorefrontProductsCombinedWhere(
  joinContext: StorefrontVariantJoinContext,
  priceParams: Pick<StorefrontPublishedProductsParams, "maxPriceCents" | "minPriceCents">
): SQL {
  if (!joinContext.needsVariantJoin) {
    return joinContext.stockWhere;
  }

  const joinConditions: SQL[] = [joinContext.stockWhere];
  const minPriceSql = sql`coalesce(${joinContext.variantStats.minPrice}, ${COALESCE_ZERO})`;

  if (priceParams.minPriceCents !== undefined) {
    joinConditions.push(sql`${minPriceSql} >= ${priceParams.minPriceCents}`);
  }
  if (priceParams.maxPriceCents !== undefined) {
    joinConditions.push(sql`${minPriceSql} <= ${priceParams.maxPriceCents}`);
  }

  return and(...joinConditions)!;
}

async function getStorefrontPublishedProductsPage(params: StorefrontPublishedProductsParams) {
  const variantStats = productVariantStatsSubquery();
  const needsVariantJoin = storefrontProductsNeedsVariantStatsJoin(params);
  const scopeConditions = buildStorefrontProductsScopeConditions(params);
  const searchCondition = buildAdminProductSearchCondition(params.searchTerm);
  const stockWhere = publishedInStockWhere(...scopeConditions, searchCondition);
  const combinedWhere = buildStorefrontProductsCombinedWhere(
    { needsVariantJoin, stockWhere, variantStats },
    { maxPriceCents: params.maxPriceCents, minPriceCents: params.minPriceCents }
  );
  const orderClauses = buildStorefrontProductsOrderClauses(params.sort, needsVariantJoin ? variantStats : undefined);

  const countQuery = needsVariantJoin
    ? db
        .select({ count: sql<number>`count(distinct ${product.id})` })
        .from(product)
        .leftJoin(variantStats, eq(variantStats.productId, product.id))
    : db.select({ count: sql<number>`count(*)` }).from(product);

  const idsBase = needsVariantJoin
    ? db.select({ productId: product.id }).from(product).leftJoin(variantStats, eq(variantStats.productId, product.id))
    : db.select({ productId: product.id }).from(product);

  const idsQuery = needsVariantJoin
    ? idsBase
        .where(combinedWhere)
        .groupBy(product.id)
        .orderBy(...orderClauses)
        .limit(params.limit)
        .offset(params.offset)
    : idsBase
        .where(combinedWhere)
        .orderBy(...orderClauses)
        .limit(params.limit)
        .offset(params.offset);

  const [[countRow], productIdRows] = await Promise.all([countQuery.where(combinedWhere), idsQuery]);

  const productIds = productIdRows.map((row) => row.productId);
  if (productIds.length === EMPTY_LENGTH) {
    return { items: [], total: countRow?.count ?? EMPTY_LENGTH };
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

export const storefrontCatalogProductAccessors = {
  getStorefrontPublishedProductsPage
};
