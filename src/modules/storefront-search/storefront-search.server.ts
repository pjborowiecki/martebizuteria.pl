import { type SQL, and, asc, desc, eq, inArray, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { CATEGORY_STATUS } from "~/src/modules/product-category/product-category.constants"
import { productCategory } from "~/src/modules/product-category/product-category.schema"
import { resolveCategoryTitle } from "~/src/modules/product-category/product-category.utils"
import { COLLECTION_STATUS } from "~/src/modules/product-collection/product-collection.constants"
import { productCollection } from "~/src/modules/product-collection/product-collection.schema"
import { resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils"
import { buildAdminProductSearchCondition } from "~/src/modules/product/product.admin-list-search.server"
import { PRODUCT_STATUS } from "~/src/modules/product/product.constants"
import { product } from "~/src/modules/product/product.schema"
import { resolveProductSubtitle, resolveProductTitle } from "~/src/modules/product/product.utils"
import { type StorefrontSearchResultItem } from "~/src/modules/storefront-search/storefront-search.types"

import { buildAdminSearchOrCondition } from "~/src/lib/admin-search.server"
import { getProductImageUrl } from "~/src/lib/image"
export const publishedProductHasAvailableStockCondition = (): SQL =>
  sql`(
    select coalesce(sum("inventory"."quantity_available"), 0)
    from "product_variant"
    left join "inventory" on "inventory"."variant_id" = "product_variant"."id"
    where "product_variant"."product_id" = ${product.id}
  ) > ${0}`

export const publishedInStockWhere = (...extraConditions: (SQL | undefined)[]): SQL => {
  const conditions = [
    eq(product.status, PRODUCT_STATUS.PUBLISHED),
    publishedProductHasAvailableStockCondition(),
    ...extraConditions,
  ].filter((condition): condition is SQL => condition !== undefined)
  return and(...conditions)!
}
export const buildCategorySearchCondition = (term: string): SQL | undefined =>
  buildAdminSearchOrCondition(term, [
    productCategory.handle,
    productCategory.titles,
    productCategory.subtitles,
    productCategory.shortDescriptions,
  ])

export const buildCollectionSearchCondition = (term: string): SQL | undefined =>
  buildAdminSearchOrCondition(term, [productCollection.handle, productCollection.titles, productCollection.descriptions])

export const searchStorefrontProducts = async (
  term: string,
  locale: string,
  limit: number,
): Promise<readonly StorefrontSearchResultItem[]> => {
  const searchCondition = buildAdminProductSearchCondition(term)
  if (searchCondition === undefined) {
    return []
  }
  const rows = await db
    .select({
      handle: product.handle,
      primaryCategoryId: product.primaryCategoryId,
      subtitles: product.subtitles,
      thumbnail: product.thumbnail,
      titles: product.titles,
    })
    .from(product)
    .where(publishedInStockWhere(searchCondition))
    .orderBy(asc(product.rank), desc(product.createdAt))
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
      .where(inArray(productCategory.id, categoryIds))
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
    } satisfies StorefrontSearchResultItem
  })
}
export const searchStorefrontCategories = async (
  term: string,
  locale: string,
  limit: number,
): Promise<readonly StorefrontSearchResultItem[]> => {
  const searchCondition = buildCategorySearchCondition(term)
  if (searchCondition === undefined) {
    return []
  }
  const rows = await db
    .select({
      handle: productCategory.handle,
      image: productCategory.image,
      titles: productCategory.titles,
    })
    .from(productCategory)
    .where(and(eq(productCategory.status, CATEGORY_STATUS.ACTIVE), searchCondition))
    .orderBy(asc(productCategory.rank), desc(productCategory.createdAt))
    .limit(limit)
  return rows.map(
    (row) =>
      ({
        handle: row.handle,
        image: getProductImageUrl(row.image),
        name: resolveCategoryTitle(row.titles, locale),
        type: "category",
      }) satisfies StorefrontSearchResultItem,
  )
}
export const searchStorefrontCollections = async (
  term: string,
  locale: string,
  limit: number,
): Promise<readonly StorefrontSearchResultItem[]> => {
  const searchCondition = buildCollectionSearchCondition(term)
  if (searchCondition === undefined) {
    return []
  }
  const rows = await db
    .select({
      handle: productCollection.handle,
      image: productCollection.image,
      titles: productCollection.titles,
    })
    .from(productCollection)
    .where(and(eq(productCollection.status, COLLECTION_STATUS.ACTIVE), searchCondition))
    .orderBy(asc(productCollection.rank), desc(productCollection.createdAt))
    .limit(limit)
  return rows.map(
    (row) =>
      ({
        handle: row.handle,
        image: getProductImageUrl(row.image),
        name: resolveCollectionTitle(row.titles, locale),
        type: "collection",
      }) satisfies StorefrontSearchResultItem,
  )
}
