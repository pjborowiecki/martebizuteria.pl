import { eq, inArray, max, sql } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { productAttribute } from "~/src/modules/product-attribute/product-attribute.schema";
import type { ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types";

const EMPTY_LENGTH = 0;

const getAdminProductAttributesQuery = db.query.productAttribute
  .findMany({
    orderBy: (attributes, { asc: ascOrder }) => [ascOrder(attributes.rank), ascOrder(attributes.handle)]
  })
  .prepare();

const getProductAttributeByHandleQuery = db.query.productAttribute
  .findFirst({
    where: eq(productAttribute.handle, sql.placeholder("handle"))
  })
  .prepare();

async function getNextProductAttributeRank(): Promise<number> {
  const NO_RANK = -1;
  const RANK_STEP = 1;
  const [row] = await db.select({ value: max(productAttribute.rank) }).from(productAttribute);
  return (row?.value ?? NO_RANK) + RANK_STEP;
}

async function insertProductAttribute(row: ProductAttribute["insert"]): Promise<void> {
  await db.insert(productAttribute).values(row);
}

async function updateProductAttribute(id: string, patch: Partial<ProductAttribute["insert"]>): Promise<void> {
  await db.update(productAttribute).set(patch).where(eq(productAttribute.id, id));
}

async function setProductAttributeRanks(updates: { id: string; rank: number }[]): Promise<void> {
  if (updates.length === EMPTY_LENGTH) {
    return;
  }

  await Promise.all(updates.map((entry) => db.update(productAttribute).set({ rank: entry.rank }).where(eq(productAttribute.id, entry.id))));
}

function getProductAttributesByIds(ids: readonly string[]): Promise<readonly { handle: string; id: string }[]> {
  if (ids.length === EMPTY_LENGTH) {
    return Promise.resolve([]);
  }

  return db
    .select({ handle: productAttribute.handle, id: productAttribute.id })
    .from(productAttribute)
    .where(inArray(productAttribute.id, [...ids]));
}

async function deleteProductAttributes(ids: readonly string[]): Promise<void> {
  if (ids.length === EMPTY_LENGTH) {
    return;
  }

  await db.delete(productAttribute).where(inArray(productAttribute.id, [...ids]));
}

export const productAttributeAccessors = {
  deleteProductAttributes,
  getAdminProductAttributesQuery,
  getNextProductAttributeRank,
  getProductAttributeByHandleQuery,
  getProductAttributesByIds,
  insertProductAttribute,
  setProductAttributeRanks,
  updateProductAttribute
};
