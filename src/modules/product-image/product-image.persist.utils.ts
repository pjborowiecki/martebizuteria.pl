import { eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { productImage } from "~/src/modules/product-image/product-image.schema"
import { getFirstImageUrl, insertRows, updateProductThumbnail } from "~/src/modules/product-image/product-image.server"
import { type ProductImageInput, buildProductImageRows } from "~/src/modules/product-image/product-image.utils"
export const syncProductThumbnail = async (productId: string): Promise<void> => {
  const url = await getFirstImageUrl(productId)
  await updateProductThumbnail(productId, url)
}
export const syncThumbnailsForProductIds = async (productIds: readonly string[]): Promise<void> => {
  if (productIds.length === 0) {
    return
  }
  await Promise.all(productIds.map((productId) => syncProductThumbnail(productId)))
}
export const replaceProductImages = async (productId: string, images: readonly ProductImageInput[]): Promise<void> => {
  await db.delete(productImage).where(eq(productImage.productId, productId))
  if (images.length === 0) {
    await syncProductThumbnail(productId)
    return
  }
  await insertRows(buildProductImageRows(productId, images))
  await syncProductThumbnail(productId)
}
