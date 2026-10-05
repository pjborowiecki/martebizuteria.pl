import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { inJsonList } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { isSellPriceCentsValid } from "~/src/modules/_core/utils/currency"
import { productVariant } from "~/src/modules/product-variant/product-variant.schema"

export const getSellPricesByVariantIds = async (variantIds: readonly string[]): Promise<Map<string, number>> => {
  if (variantIds.length === 0) {
    return new Map()
  }

  const rows = await db
    .select({ price: productVariant.price, variantId: productVariant.id })
    .from(productVariant)
    .where(inJsonList(productVariant.id, variantIds))

  return new Map(rows.filter((row) => isSellPriceCentsValid(row.price)).map((row) => [row.variantId, row.price]))
}

export const getVariantIdsByProductIds = async (productIds: readonly string[]): Promise<string[]> => {
  const rows = await db.select({ id: productVariant.id }).from(productVariant).where(inJsonList(productVariant.productId, productIds))

  return rows.map((row) => row.id)
}
