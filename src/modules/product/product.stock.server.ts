import { type SQL, and, eq, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { inventory } from "~/src/modules/inventory/inventory.schema"
import { productVariant } from "~/src/modules/product-variant/product-variant.schema"
import { PRODUCT_STATUS } from "~/src/modules/product/product.constants"
import { product } from "~/src/modules/product/product.schema"

export const totalStockSubquery = () =>
  sql<number>`(
    select coalesce(sum("inventory"."quantity_available"), 0)
    from "product_variant"
    left join "inventory" on "inventory"."variant_id" = "product_variant"."id"
    where "product_variant"."product_id" = ${product.id}
  )`

export const publishedInStockWhere = (...extraConditions: (SQL | undefined)[]): SQL => {
  const conditions = [eq(product.status, PRODUCT_STATUS.PUBLISHED), sql`(${totalStockSubquery()}) > ${0}`, ...extraConditions].filter(
    (condition): condition is SQL => condition !== undefined,
  )

  return and(...conditions)!
}

export const productVariantStatsSubquery = () =>
  db
    .select({
      minPrice: sql<number | null>`min(${productVariant.price})`.as("min_price"),
      productId: productVariant.productId,
      totalStock: sql<number>`coalesce(sum(${inventory.quantityAvailable}), 0)`.as("total_stock"),
      variantCount: sql<number>`count(${productVariant.id})`.as("variant_count"),
    })
    .from(productVariant)
    .leftJoin(inventory, eq(inventory.variantId, productVariant.id))
    .groupBy(productVariant.productId)
    .as("product_variant_stats")

export const storefrontListVariantColumns = {
  id: true,
  price: true,
  productId: true,
  title: true,
} as const
