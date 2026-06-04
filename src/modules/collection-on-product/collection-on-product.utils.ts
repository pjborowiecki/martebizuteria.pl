import type { collectionOnProduct } from "~/src/modules/collection-on-product/collection-on-product.schema";

export function resolveCollectionIds(assignments: readonly { readonly collectionId: string }[]): string[] {
  return assignments.map((row) => row.collectionId);
}

export function buildCollectionOnProductRows(
  productId: string,
  collectionIds: readonly string[]
): (typeof collectionOnProduct.$inferInsert)[] {
  const uniqueIds = [...new Set(collectionIds)];
  return uniqueIds.map((collectionId, rank) => ({ collectionId, productId, rank }));
}
