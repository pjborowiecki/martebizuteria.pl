import { and, count, desc, eq, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { productVariant } from "~/src/modules/product-variant/product-variant.schema"
import { PRODUCT_STATUS } from "~/src/modules/product/product.constants"
import { product } from "~/src/modules/product/product.schema"
import { totalStockSubquery } from "~/src/modules/product/product.stock.server"
import { WISHLIST_MAX_ITEMS } from "~/src/modules/wishlist/wishlist.constants"
import { wishlistItem } from "~/src/modules/wishlist/wishlist.schema"

const NO_ROWS = 0

export const insertWishlistItem = async (userId: string, productId: string): Promise<void> => {
  await db
    .insert(wishlistItem)
    .values({ productId, userId })
    .onConflictDoNothing({ target: [wishlistItem.userId, wishlistItem.productId] })
}

export const deleteWishlistItemQuery = (userId: string, productId: string) =>
  db
    .delete(wishlistItem)
    .where(and(eq(wishlistItem.userId, userId), eq(wishlistItem.productId, productId)))
    .returning({ id: wishlistItem.id })

export const countWishlistItems = async (userId: string): Promise<number> => {
  const [row] = await db.select({ total: count() }).from(wishlistItem).where(eq(wishlistItem.userId, userId))

  return row?.total ?? NO_ROWS
}

export const getWishlistProductIds = async (userId: string): Promise<string[]> => {
  const rows = await db.select({ productId: wishlistItem.productId }).from(wishlistItem).where(eq(wishlistItem.userId, userId))

  return rows.map((row) => row.productId)
}

export const getPublishedProductForCustomerQuery = (userId: string, productId: string) =>
  db
    .select({ id: product.id, wishlistCount: db.$count(wishlistItem, eq(wishlistItem.userId, userId)) })
    .from(product)
    .where(and(eq(product.id, productId), eq(product.status, PRODUCT_STATUS.PUBLISHED)))
    .limit(1)

export const getWishlistRows = (userId: string, limit = WISHLIST_MAX_ITEMS) =>
  db
    .select({
      addedAt: wishlistItem.createdAt,
      handle: product.handle,
      priceMinorUnits: sql<number | null>`(
        select min(${productVariant.price})
        from ${productVariant}
        where ${productVariant.productId} = ${product.id}
      )`,
      productId: product.id,
      status: product.status,
      thumbnail: product.thumbnail,
      titles: product.titles,
      totalStock: totalStockSubquery(),
      variantId: sql<string | null>`(
        select ${productVariant.id}
        from ${productVariant}
        where ${productVariant.productId} = ${product.id}
        order by ${productVariant.price}
        limit 1
      )`,
      variantTitle: sql<string | null>`(
        select ${productVariant.title}
        from ${productVariant}
        where ${productVariant.productId} = ${product.id}
        order by ${productVariant.price}
        limit 1
      )`,
    })
    .from(wishlistItem)
    .innerJoin(product, eq(wishlistItem.productId, product.id))
    .where(eq(wishlistItem.userId, userId))
    .orderBy(desc(wishlistItem.createdAt))
    .limit(limit)
