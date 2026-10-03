import { eq, sql } from "drizzle-orm"

import { type DrizzleBatchStatement, insertRowChunks } from "~/src/integrations/drizzle-orm/drizzle.batch"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { productImage } from "~/src/modules/product-image/product-image.schema"
import { type ProductImageInput, buildProductImageRows } from "~/src/modules/product-image/product-image.utils"
import { product } from "~/src/modules/product/product.schema"

export const prepareProductImagesBatch = (productId: string, images: readonly ProductImageInput[]): DrizzleBatchStatement[] => {
  const [thumbnail] = images.toSorted((left, right) => left.rank - right.rank)

  return [
    db.delete(productImage).where(eq(productImage.productId, productId)),
    ...insertRowChunks(productImage, buildProductImageRows(productId, images)).map((rows) => db.insert(productImage).values(rows)),
    db
      .update(product)
      .set({ thumbnail: thumbnail?.url ?? sql`null` })
      .where(eq(product.id, productId)),
  ]
}
