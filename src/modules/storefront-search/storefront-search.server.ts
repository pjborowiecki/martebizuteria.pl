import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { buildAdminSearchOrCondition, normalizeAdminSearchTerm } from "~/src/lib/_utils/admin-search.server";
import { getProductImageUrl } from "~/src/lib/_utils/image";

import { CATEGORY_STATUS } from "~/src/modules/product-category/product-category.constants";
import { productCategory } from "~/src/modules/product-category/product-category.schema";
import { resolveCategoryTitle } from "~/src/modules/product-category/product-category.utils";
import { COLLECTION_STATUS } from "~/src/modules/product-collection/product-collection.constants";
import { productCollection } from "~/src/modules/product-collection/product-collection.schema";
import { resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils";
import { buildAdminProductSearchCondition } from "~/src/modules/product/product.admin-list-search.server";
import { PRODUCT_STATUS } from "~/src/modules/product/product.constants";
import { product } from "~/src/modules/product/product.schema";
import { resolveProductSubtitle, resolveProductTitle } from "~/src/modules/product/product.utils";
import {
  STOREFRONT_SEARCH_LIMIT_PER_GROUP,
  STOREFRONT_SEARCH_TRENDING_LIMIT,
  STOREFRONT_SEARCH_TRENDING_SOURCE_COUNT
} from "~/src/modules/storefront-search/storefront-search.constants";
import type {
  StorefrontSearchResultItem,
  StorefrontSearchResults,
  StorefrontSearchTrendingItem
} from "~/src/modules/storefront-search/storefront-search.types";

const ZERO_AVAILABLE_STOCK = 0;
const EMPTY_LENGTH = 0;

function publishedProductHasAvailableStockCondition(): SQL {
  return sql`(
    select coalesce(sum("inventory"."quantity_available"), 0)
    from "product_variant"
    left join "inventory" on "inventory"."variant_id" = "product_variant"."id"
    where "product_variant"."product_id" = ${product.id}
  ) > ${ZERO_AVAILABLE_STOCK}`;
}

function publishedInStockWhere(...extraConditions: (SQL | undefined)[]): SQL {
  const conditions = [
    eq(product.status, PRODUCT_STATUS.PUBLISHED),
    publishedProductHasAvailableStockCondition(),
    ...extraConditions
  ].filter((condition): condition is SQL => condition !== undefined);

  return and(...conditions)!;
}

function buildCategorySearchCondition(term: string): SQL | undefined {
  return buildAdminSearchOrCondition(term, [
    productCategory.handle,
    productCategory.titles,
    productCategory.subtitles,
    productCategory.shortDescriptions
  ]);
}

function buildCollectionSearchCondition(term: string): SQL | undefined {
  return buildAdminSearchOrCondition(term, [productCollection.handle, productCollection.titles, productCollection.descriptions]);
}

async function searchStorefrontProducts(term: string, locale: string, limit: number): Promise<readonly StorefrontSearchResultItem[]> {
  const searchCondition = buildAdminProductSearchCondition(term);
  if (searchCondition === undefined) {
    return [];
  }

  const rows = await db
    .select({
      handle: product.handle,
      primaryCategoryId: product.primaryCategoryId,
      subtitles: product.subtitles,
      thumbnail: product.thumbnail,
      titles: product.titles
    })
    .from(product)
    .where(publishedInStockWhere(searchCondition))
    .orderBy(asc(product.rank), desc(product.createdAt))
    .limit(limit);

  if (rows.length === EMPTY_LENGTH) {
    return [];
  }

  const categoryIds = [...new Set(rows.map((row) => row.primaryCategoryId).filter((id): id is string => id !== null))];
  const categoryTitleById = new Map<string, string>();

  if (categoryIds.length > EMPTY_LENGTH) {
    const categoryRows = await db
      .select({ id: productCategory.id, titles: productCategory.titles })
      .from(productCategory)
      .where(inArray(productCategory.id, categoryIds));

    for (const categoryRow of categoryRows) {
      categoryTitleById.set(categoryRow.id, resolveCategoryTitle(categoryRow.titles, locale));
    }
  }

  return rows.map((row) => {
    const subtitle = resolveProductSubtitle(row.subtitles, locale);
    const categoryDetail = row.primaryCategoryId === null ? undefined : categoryTitleById.get(row.primaryCategoryId);
    const detail = subtitle.trim() === "" ? categoryDetail : subtitle;

    return {
      detail,
      handle: row.handle,
      image: getProductImageUrl(row.thumbnail),
      name: resolveProductTitle(row.titles, locale),
      type: "product"
    } satisfies StorefrontSearchResultItem;
  });
}

async function searchStorefrontCategories(term: string, locale: string, limit: number): Promise<readonly StorefrontSearchResultItem[]> {
  const searchCondition = buildCategorySearchCondition(term);
  if (searchCondition === undefined) {
    return [];
  }

  const rows = await db
    .select({
      handle: productCategory.handle,
      image: productCategory.image,
      titles: productCategory.titles
    })
    .from(productCategory)
    .where(and(eq(productCategory.status, CATEGORY_STATUS.ACTIVE), searchCondition))
    .orderBy(asc(productCategory.rank), desc(productCategory.createdAt))
    .limit(limit);

  return rows.map(
    (row) =>
      ({
        handle: row.handle,
        image: getProductImageUrl(row.image),
        name: resolveCategoryTitle(row.titles, locale),
        type: "category"
      }) satisfies StorefrontSearchResultItem
  );
}

async function searchStorefrontCollections(term: string, locale: string, limit: number): Promise<readonly StorefrontSearchResultItem[]> {
  const searchCondition = buildCollectionSearchCondition(term);
  if (searchCondition === undefined) {
    return [];
  }

  const rows = await db
    .select({
      handle: productCollection.handle,
      image: productCollection.image,
      titles: productCollection.titles
    })
    .from(productCollection)
    .where(and(eq(productCollection.status, COLLECTION_STATUS.ACTIVE), searchCondition))
    .orderBy(asc(productCollection.rank), desc(productCollection.createdAt))
    .limit(limit);

  return rows.map(
    (row) =>
      ({
        handle: row.handle,
        image: getProductImageUrl(row.image),
        name: resolveCollectionTitle(row.titles, locale),
        type: "collection"
      }) satisfies StorefrontSearchResultItem
  );
}

export async function searchStorefrontCatalog(
  query: string,
  locale: string,
  limit = STOREFRONT_SEARCH_LIMIT_PER_GROUP
): Promise<StorefrontSearchResults> {
  const term = normalizeAdminSearchTerm(query);
  if (term === undefined) {
    return { categories: [], collections: [], products: [] };
  }

  const [products, categories, collections] = await Promise.all([
    searchStorefrontProducts(term, locale, limit),
    searchStorefrontCategories(term, locale, limit),
    searchStorefrontCollections(term, locale, limit)
  ]);

  return { categories, collections, products };
}

export async function getStorefrontSearchTrending(locale: string): Promise<readonly StorefrontSearchTrendingItem[]> {
  const perSourceLimit = Math.ceil(STOREFRONT_SEARCH_TRENDING_LIMIT / STOREFRONT_SEARCH_TRENDING_SOURCE_COUNT);

  const [categories, collections] = await Promise.all([
    db
      .select({
        handle: productCategory.handle,
        image: productCategory.image,
        titles: productCategory.titles
      })
      .from(productCategory)
      .where(eq(productCategory.status, CATEGORY_STATUS.ACTIVE))
      .orderBy(asc(productCategory.rank), desc(productCategory.createdAt))
      .limit(perSourceLimit),
    db
      .select({
        handle: productCollection.handle,
        image: productCollection.image,
        titles: productCollection.titles
      })
      .from(productCollection)
      .where(eq(productCollection.status, COLLECTION_STATUS.ACTIVE))
      .orderBy(asc(productCollection.rank), desc(productCollection.createdAt))
      .limit(perSourceLimit)
  ]);

  const items: StorefrontSearchTrendingItem[] = [];

  for (const row of categories) {
    const label = resolveCategoryTitle(row.titles, locale).trim();
    if (label !== "") {
      items.push({
        handle: row.handle,
        image: getProductImageUrl(row.image),
        label,
        type: "category"
      });
    }
  }

  for (const row of collections) {
    const label = resolveCollectionTitle(row.titles, locale).trim();
    if (label !== "") {
      items.push({
        handle: row.handle,
        image: getProductImageUrl(row.image),
        label,
        type: "collection"
      });
    }
  }

  return items.slice(EMPTY_LENGTH, STOREFRONT_SEARCH_TRENDING_LIMIT);
}
