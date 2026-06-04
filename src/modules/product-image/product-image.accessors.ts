import { asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { productImage } from "~/src/modules/product-image/product-image.schema";
import { product } from "~/src/modules/product/product.schema";

const EMPTY_LENGTH = 0;

const getProductImagesQuery = db.query.productImage
  .findMany({
    orderBy: (images, { asc: ascOrder }) => [ascOrder(images.rank), ascOrder(images.createdAt)],
    where: eq(productImage.productId, sql.placeholder("productId"))
  })
  .prepare();

async function getFirstImageUrl(productId: string): Promise<string | undefined> {
  const [first] = await db.query.productImage.findMany({
    columns: { url: true },
    limit: 1,
    orderBy: [asc(productImage.rank), asc(productImage.createdAt)],
    where: eq(productImage.productId, productId)
  });

  return first?.url;
}

async function updateProductThumbnail(productId: string, url: string | undefined): Promise<void> {
  await db.update(product).set({ thumbnail: url }).where(eq(product.id, productId));
}

async function updateRank(id: string, rank: number): Promise<void> {
  await db.update(productImage).set({ rank }).where(eq(productImage.id, id));
}

async function deleteByProductId(productId: string): Promise<void> {
  await db.delete(productImage).where(eq(productImage.productId, productId));
}

async function deleteByIds(ids: readonly string[]): Promise<void> {
  if (ids.length === EMPTY_LENGTH) {
    return;
  }

  await db.delete(productImage).where(inArray(productImage.id, [...ids]));
}

async function getProductIdsForImageIds(ids: readonly string[]): Promise<string[]> {
  if (ids.length === EMPTY_LENGTH) {
    return [];
  }

  const rows = await db
    .select({ productId: productImage.productId })
    .from(productImage)
    .where(inArray(productImage.id, [...ids]));

  return [...new Set(rows.map((row) => row.productId))];
}

async function insertRows(rows: (typeof productImage.$inferInsert)[]): Promise<void> {
  if (rows.length === EMPTY_LENGTH) {
    return;
  }

  await db.insert(productImage).values(rows);
}

export const productImageAccessors = {
  deleteByIds,
  deleteByProductId,
  getFirstImageUrl,
  getProductIdsForImageIds,
  getProductImagesQuery,
  insertRows,
  updateProductThumbnail,
  updateRank
};
