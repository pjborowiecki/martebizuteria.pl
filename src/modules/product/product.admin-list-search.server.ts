import { type SQL, inArray, or, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import {
  buildAdminLikePattern,
  buildAdminSearchOrCondition,
  localizedTextColumns,
  normalizeAdminSearchTerm,
} from "~/src/modules/_core/utils/search-conditions.server"
import { productVariant } from "~/src/modules/product-variant/product-variant.schema"
import { product } from "~/src/modules/product/product.schema"

export const buildAdminProductSearchCondition = (search: string | undefined): SQL | undefined => {
  const normalized = normalizeAdminSearchTerm(search)
  if (normalized === undefined) {
    return undefined
  }

  const pattern = buildAdminLikePattern(normalized)
  const textMatch = buildAdminSearchOrCondition(normalized, [
    product.handle,
    product.id,
    ...localizedTextColumns(product.titles),
    ...localizedTextColumns(product.subtitles),
    ...localizedTextColumns(product.descriptions),
  ])

  const skuMatch = inArray(
    product.id,
    db
      .select({
        id: productVariant.productId,
      })
      .from(productVariant)
      .where(sql`${productVariant.sku} like ${pattern} escape '\\'`),
  )

  return or(textMatch, skuMatch)
}
