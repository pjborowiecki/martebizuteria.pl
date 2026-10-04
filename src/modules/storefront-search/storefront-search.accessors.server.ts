import { type SQL, and, eq, inArray, sql } from "drizzle-orm"
import { unionAll } from "drizzle-orm/sqlite-core"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema"
import { collectionOnProduct } from "~/src/modules/collection-on-product/collection-on-product.schema"
import { CATEGORY_STATUS } from "~/src/modules/product-category/product-category.constants"
import { productCategory } from "~/src/modules/product-category/product-category.schema"
import { COLLECTION_STATUS } from "~/src/modules/product-collection/product-collection.constants"
import { productCollection } from "~/src/modules/product-collection/product-collection.schema"
import { productVariant } from "~/src/modules/product-variant/product-variant.schema"
import { storefrontSearch } from "~/src/modules/storefront-search/storefront-search.schema"
import { type StorefrontSearch } from "~/src/modules/storefront-search/storefront-search.types"
import { buildStorefrontSearchExpression } from "~/src/modules/storefront-search/storefront-search.utils"

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
