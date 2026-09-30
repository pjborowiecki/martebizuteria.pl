import { type collectionOnProduct } from "~/src/modules/collection-on-product/collection-on-product.schema"

export const resolveCollectionIds = (
  assignments: readonly {
    readonly collectionId: string
  }[],
): string[] => assignments.map((row) => row.collectionId)

export const buildCollectionOnProductRows = (
  productId: string,
  collectionIds: readonly string[],
): (typeof collectionOnProduct.$inferInsert)[] => {
  const uniqueIds = [...new Set(collectionIds)]

  return uniqueIds.map((collectionId, rank) => ({
    collectionId,
    productId,
    rank,
  }))
}
