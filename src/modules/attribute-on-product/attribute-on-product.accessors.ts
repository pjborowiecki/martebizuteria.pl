import { and, count, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { attributeOnProduct } from "~/src/modules/attribute-on-product/attribute-on-product.schema";

const EMPTY_LENGTH = 0;
const ZERO_COUNT = 0;

const getByProductIdQuery = db.query.attributeOnProduct
  .findMany({
    orderBy: (values, { asc: ascOrder }) => [ascOrder(values.rank)],
    where: eq(attributeOnProduct.productId, sql.placeholder("productId")),
    with: { productAttribute: true }
  })
  .prepare();

async function getProductCountsByAttributeId(): Promise<Map<string, number>> {
  const rows = await db
    .select({ attributeId: attributeOnProduct.attributeId, productCount: count() })
    .from(attributeOnProduct)
    .groupBy(attributeOnProduct.attributeId);

  return new Map(rows.map((row) => [row.attributeId, row.productCount]));
}

async function countForAttributeIds(ids: readonly string[]): Promise<number> {
  if (ids.length === EMPTY_LENGTH) {
    return ZERO_COUNT;
  }

  const [row] = await db
    .select({ value: count() })
    .from(attributeOnProduct)
    .where(inArray(attributeOnProduct.attributeId, [...ids]));

  return row?.value ?? ZERO_COUNT;
}

async function deleteByProductId(productId: string): Promise<void> {
  await db.delete(attributeOnProduct).where(eq(attributeOnProduct.productId, productId));
}

async function deleteProductLevelByProductId(productId: string): Promise<void> {
  await db.delete(attributeOnProduct).where(and(eq(attributeOnProduct.productId, productId), isNull(attributeOnProduct.variantId)));
}

async function deleteByVariantId(variantId: string): Promise<void> {
  await db.delete(attributeOnProduct).where(eq(attributeOnProduct.variantId, variantId));
}

async function insertRows(rows: (typeof attributeOnProduct.$inferInsert)[]): Promise<void> {
  if (rows.length === EMPTY_LENGTH) {
    return;
  }

  await db.insert(attributeOnProduct).values(rows);
}

export const attributeOnProductAccessors = {
  countForAttributeIds,
  deleteByProductId,
  deleteByVariantId,
  deleteProductLevelByProductId,
  getByProductIdQuery,
  getProductCountsByAttributeId,
  insertRows
};
