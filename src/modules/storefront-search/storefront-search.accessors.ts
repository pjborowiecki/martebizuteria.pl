import { type SQL, and, asc, eq, inArray, sql } from "drizzle-orm"
import { unionAll } from "drizzle-orm/sqlite-core"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { inJsonList } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema"
import { collectionOnProduct } from "~/src/modules/collection-on-product/collection-on-product.schema"
import { CATEGORY_STATUS } from "~/src/modules/product-category/product-category.constants"
import { productCategory } from "~/src/modules/product-category/product-category.schema"
import { resolveCategoryTitle } from "~/src/modules/product-category/product-category.utils"
import { COLLECTION_STATUS } from "~/src/modules/product-collection/product-collection.constants"
import { productCollection } from "~/src/modules/product-collection/product-collection.schema"
import { resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils"
import { productVariant } from "~/src/modules/product-variant/product-variant.schema"
import { publishedInStockWhere } from "~/src/modules/product/product.accessors"
import { product } from "~/src/modules/product/product.schema"
import { resolveProductSubtitle, resolveProductTitle } from "~/src/modules/product/product.utils"
import { storefrontSearch } from "~/src/modules/storefront-search/storefront-search.schema"
import { type StorefrontSearch } from "~/src/modules/storefront-search/storefront-search.types"
import { buildStorefrontSearchExpression } from "~/src/modules/storefront-search/storefront-search.utils"

import { getProductImageUrl } from "~/src/lib/image"

const RELEVANCE_WEIGHTS = { description: 1, entityId: 0, handle: 2, kind: 0, subtitle: 5, tags: 3, title: 10 } as const

const relevance = sql<number>`bm25(${storefrontSearch}, ${sql.raw(
  [
    RELEVANCE_WEIGHTS.kind,
    RELEVANCE_WEIGHTS.entityId,
    RELEVANCE_WEIGHTS.title,
    RELEVANCE_WEIGHTS.subtitle,
    RELEVANCE_WEIGHTS.tags,
    RELEVANCE_WEIGHTS.description,
    RELEVANCE_WEIGHTS.handle,
  ].join(", "),
)})`

const indexMatches = (kind: StorefrontSearch["indexedType"], expression: string): SQL =>
  and(sql`${storefrontSearch} match ${expression}`, eq(storefrontSearch.kind, kind))!

export const storefrontSearchMatches = (kind: StorefrontSearch["indexedType"], expression: string) =>
  db
    .select({
      entityId: storefrontSearch.entityId,
      score: relevance.as("score"),
    })
    .from(storefrontSearch)
    .where(indexMatches(kind, expression))
    .as("storefront_search_matches")

const matchedEntityIds = (kind: StorefrontSearch["indexedType"], expression: string) =>
  db.select({ entityId: storefrontSearch.entityId }).from(storefrontSearch).where(indexMatches(kind, expression))

const productsInMatchedCategories = (expression: string) => {
  const matchedCategoryIds = matchedEntityIds("category", expression)

  return db
    .select({ productId: categoryOnProduct.productId, score: sql<number | null>`null`.as("score") })
    .from(categoryOnProduct)
    .innerJoin(productCategory, eq(productCategory.id, categoryOnProduct.categoryId))
    .where(and(eq(productCategory.status, CATEGORY_STATUS.ACTIVE), inArray(productCategory.id, matchedCategoryIds)))
}

const productsInMatchedCollections = (expression: string) => {
  const matchedCollectionIds = matchedEntityIds("collection", expression)

  return db
    .select({ productId: collectionOnProduct.productId, score: sql<number | null>`null`.as("score") })
    .from(collectionOnProduct)
    .innerJoin(productCollection, eq(productCollection.id, collectionOnProduct.collectionId))
    .where(and(eq(productCollection.status, COLLECTION_STATUS.ACTIVE), inArray(productCollection.id, matchedCollectionIds)))
}

const productsWithSku = (term: string) =>
  db
    .select({ productId: productVariant.productId, score: sql<number | null>`null`.as("score") })
    .from(productVariant)
    .where(eq(sql`upper(${productVariant.sku})`, term.toUpperCase()))

const productsMatchingText = (expression: string) =>
  db
    .select({ productId: storefrontSearch.entityId, score: relevance.as("score") })
    .from(storefrontSearch)
    .where(indexMatches("product", expression))

const groupedProductMatches = (term: string, expression: string) => {
  const hits = unionAll(
    productsWithSku(term),
    productsInMatchedCategories(expression),
    productsInMatchedCollections(expression),
    productsMatchingText(expression),
  ).as("storefront_product_hits")

  return db.$with("storefront_product_matches").as(
    db
      .select({ productId: hits.productId, score: sql<number | null>`min(${hits.score})`.as("score") })
      .from(hits)
      .groupBy(hits.productId),
  )
}

export const storefrontProductMatches = (term: string) => {
  const expression = buildStorefrontSearchExpression(term)

  return expression === undefined ? undefined : groupedProductMatches(term, expression)
}

export const searchStorefrontProducts = async (
  term: string,
  locale: string,
  limit: number,
): Promise<readonly StorefrontSearch["resultItem"][]> => {
  const expression = buildStorefrontSearchExpression(term)
  if (expression === undefined) {
    return []
  }

  const matches = storefrontSearchMatches("product", expression)
  const rows = await db
    .select({
      handle: product.handle,
      primaryCategoryId: product.primaryCategoryId,
      subtitles: product.subtitles,
      thumbnail: product.thumbnail,
      titles: product.titles,
    })
    .from(product)
    .innerJoin(matches, eq(matches.entityId, product.id))
    .where(publishedInStockWhere())
    .orderBy(asc(matches.score), asc(product.rank))
    .limit(limit)
  if (rows.length === 0) {
    return []
  }

  const categoryIds = [...new Set(rows.map((row) => row.primaryCategoryId).filter((id): id is string => id !== null))]
  const categoryTitleById = new Map<string, string>()
  if (categoryIds.length > 0) {
    const categoryRows = await db
      .select({
        id: productCategory.id,
        titles: productCategory.titles,
      })
      .from(productCategory)
      .where(inJsonList(productCategory.id, categoryIds))
    for (const categoryRow of categoryRows) {
      categoryTitleById.set(categoryRow.id, resolveCategoryTitle(categoryRow.titles, locale))
    }
  }

  return rows.map((row) => {
    const subtitle = resolveProductSubtitle(row.subtitles, locale)
    const categoryDetail = row.primaryCategoryId === null ? undefined : categoryTitleById.get(row.primaryCategoryId)
    const detail = subtitle.trim() === "" ? categoryDetail : subtitle

    return {
      detail,
      handle: row.handle,
      image: getProductImageUrl(row.thumbnail),
      name: resolveProductTitle(row.titles, locale),
      type: "product",
    } satisfies StorefrontSearch["resultItem"]
  })
}

export const searchStorefrontCategories = async (
  term: string,
  locale: string,
  limit: number,
): Promise<readonly StorefrontSearch["resultItem"][]> => {
  const expression = buildStorefrontSearchExpression(term)
  if (expression === undefined) {
    return []
  }

  const matches = storefrontSearchMatches("category", expression)
  const rows = await db
    .select({
      handle: productCategory.handle,
      image: productCategory.image,
      titles: productCategory.titles,
    })
    .from(productCategory)
    .innerJoin(matches, eq(matches.entityId, productCategory.id))
    .where(eq(productCategory.status, CATEGORY_STATUS.ACTIVE))
    .orderBy(asc(matches.score), asc(productCategory.rank))
    .limit(limit)

  return rows.map(
    (row) =>
      ({
        handle: row.handle,
        image: getProductImageUrl(row.image),
        name: resolveCategoryTitle(row.titles, locale),
        type: "category",
      }) satisfies StorefrontSearch["resultItem"],
  )
}

export const searchStorefrontCollections = async (
  term: string,
  locale: string,
  limit: number,
): Promise<readonly StorefrontSearch["resultItem"][]> => {
  const expression = buildStorefrontSearchExpression(term)
  if (expression === undefined) {
    return []
  }

  const matches = storefrontSearchMatches("collection", expression)
  const rows = await db
    .select({
      handle: productCollection.handle,
      image: productCollection.image,
      titles: productCollection.titles,
    })
    .from(productCollection)
    .innerJoin(matches, eq(matches.entityId, productCollection.id))
    .where(eq(productCollection.status, COLLECTION_STATUS.ACTIVE))
    .orderBy(asc(matches.score), asc(productCollection.rank))
    .limit(limit)

  return rows.map(
    (row) =>
      ({
        handle: row.handle,
        image: getProductImageUrl(row.image),
        name: resolveCollectionTitle(row.titles, locale),
        type: "collection",
      }) satisfies StorefrontSearch["resultItem"],
  )
}
