import { type SQL, asc, eq, inArray, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { productImage } from "~/src/modules/product-image/product-image.schema"
import { product } from "~/src/modules/product/product.schema"
export const getFirstImageUrl = async (productId: string): Promise<string | undefined> => {
  const [first] = await db.query.productImage.findMany({
    columns: {
      url: true,
    },
    limit: 1,
    orderBy: [asc(productImage.rank), asc(productImage.createdAt)],
    where: eq(productImage.productId, productId),
  })
  return first?.url
}
const thumbnailUpdateValue = (url: string | undefined): string | SQL =>
  // Drizzle drops `undefined` from `.set()` and throws "No values to set".
  url ?? sql`null`

export const updateProductThumbnail = async (productId: string, url: string | undefined): Promise<void> => {
  await db
    .update(product)
    .set({
      thumbnail: thumbnailUpdateValue(url),
    })
    .where(eq(product.id, productId))
}
export const deleteByIds = async (ids: readonly string[]): Promise<void> => {
  if (ids.length === 0) {
    return
  }
  await db.delete(productImage).where(inArray(productImage.id, [...ids]))
}
export const getProductIdsForImageIds = async (ids: readonly string[]): Promise<string[]> => {
  if (ids.length === 0) {
    return []
  }
  const rows = await db
    .select({
      productId: productImage.productId,
    })
    .from(productImage)
    .where(inArray(productImage.id, [...ids]))
  return [...new Set(rows.map((row) => row.productId))]
}
export const insertRows = async (rows: (typeof productImage.$inferInsert)[]): Promise<void> => {
  if (rows.length === 0) {
    return
  }
  await db.insert(productImage).values(rows)
}
export const getProductImagesQuery = db.query.productImage
  .findMany({
    orderBy: (images, { asc: ascOrder }) => [ascOrder(images.rank), ascOrder(images.createdAt)],
    where: eq(productImage.productId, sql.placeholder("productId")),
  })
  .prepare()
