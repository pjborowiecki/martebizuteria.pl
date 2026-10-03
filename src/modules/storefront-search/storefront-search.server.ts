import { asc, eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { inJsonList } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { CATEGORY_STATUS } from "~/src/modules/product-category/product-category.constants"
import { productCategory } from "~/src/modules/product-category/product-category.schema"
import { resolveCategoryTitle } from "~/src/modules/product-category/product-category.utils"
import { COLLECTION_STATUS } from "~/src/modules/product-collection/product-collection.constants"
import { productCollection } from "~/src/modules/product-collection/product-collection.schema"
import { resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils"
import { product } from "~/src/modules/product/product.schema"
import { publishedInStockWhere } from "~/src/modules/product/product.stock.server"
import { resolveProductSubtitle, resolveProductTitle } from "~/src/modules/product/product.utils"
import { storefrontSearchMatches } from "~/src/modules/storefront-search/storefront-search.accessors.server"
import { type StorefrontSearch } from "~/src/modules/storefront-search/storefront-search.types"
import { buildStorefrontSearchExpression } from "~/src/modules/storefront-search/storefront-search.utils"

import { getProductImageUrl } from "~/src/lib/image"

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
