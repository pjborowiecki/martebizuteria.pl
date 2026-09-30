import { count, eq, inArray, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { attributeOnProduct } from "~/src/modules/attribute-on-product/attribute-on-product.schema"

export const getByProductIdQuery = db.query.attributeOnProduct
  .findMany({
    orderBy: (values, { asc: ascOrder }) => [ascOrder(values.rank)],
    where: eq(attributeOnProduct.productId, sql.placeholder("productId")),
    with: {
      productAttribute: true,
    },
  })
  .prepare()

export const getProductCountsByAttributeId = async (): Promise<Map<string, number>> => {
  const rows = await db
    .select({
      attributeId: attributeOnProduct.attributeId,
      productCount: count(),
    })
    .from(attributeOnProduct)
    .groupBy(attributeOnProduct.attributeId)
  return new Map(rows.map((row) => [row.attributeId, row.productCount]))
}

export const countForAttributeIds = async (ids: readonly string[]): Promise<number> => {
  if (ids.length === 0) {
    return 0
  }

  const [row] = await db
    .select({
      value: count(),
    })
    .from(attributeOnProduct)
    .where(inArray(attributeOnProduct.attributeId, [...ids]))
  return row?.value ?? 0
}

export const insertRows = async (rows: (typeof attributeOnProduct.$inferInsert)[]): Promise<void> => {
  if (rows.length === 0) {
    return
  }
  await db.insert(attributeOnProduct).values(rows)
}
