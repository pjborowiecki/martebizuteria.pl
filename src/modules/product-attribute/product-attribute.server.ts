import { eq, inArray, max, sql } from "drizzle-orm"

import { type DrizzleBatchStatement, runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { getProductCountsByAttributeId } from "~/src/modules/attribute-on-product/attribute-on-product.server"
import { productAttribute } from "~/src/modules/product-attribute/product-attribute.schema"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

const RANK_UPDATE_CHUNK_SIZE = 30

export const getAdminProductAttributesQuery = db.query.productAttribute
  .findMany({
    orderBy: (attributes, { asc: ascOrder }) => [ascOrder(attributes.rank), ascOrder(attributes.handle)],
  })
  .prepare()

export const getProductAttributeByHandleQuery = db.query.productAttribute
  .findFirst({
    where: eq(productAttribute.handle, sql.placeholder("handle")),
  })
  .prepare()

export const getNextProductAttributeRank = async (): Promise<number> => {
  const NO_RANK = -1
  const [row] = await db
    .select({
      value: max(productAttribute.rank),
    })
    .from(productAttribute)
  return (row?.value ?? NO_RANK) + 1
}

export const setProductAttributeRanks = async (
  updates: readonly {
    id: string
    rank: number
  }[],
): Promise<void> => {
  const statements: DrizzleBatchStatement[] = []
  for (let offset = 0; offset < updates.length; offset += RANK_UPDATE_CHUNK_SIZE) {
    const chunk = updates.slice(offset, offset + RANK_UPDATE_CHUNK_SIZE)
    const cases = chunk.map((entry) => sql`when ${productAttribute.id} = ${entry.id} then ${entry.rank}`)
    const rankCase = sql`(case ${sql.join(cases, sql.raw(" "))} end)`
    const chunkIds = chunk.map((entry) => entry.id)
    statements.push(
      db
        .update(productAttribute)
        .set({
          rank: rankCase,
        })
        .where(inArray(productAttribute.id, chunkIds)),
    )
  }
  await runDrizzleBatch(statements)
}

export const getProductAttributesByIds = (
  ids: readonly string[],
): Promise<
  readonly {
    handle: string
    id: string
  }[]
> => {
  if (ids.length === 0) {
    return Promise.resolve([])
  }

  return db
    .select({
      handle: productAttribute.handle,
      id: productAttribute.id,
    })
    .from(productAttribute)
    .where(inArray(productAttribute.id, [...ids]))
}

export const deleteProductAttributes = async (ids: readonly string[]): Promise<void> => {
  if (ids.length === 0) {
    return
  }
  await db.delete(productAttribute).where(inArray(productAttribute.id, [...ids]))
}

export const getAdminProductAttributeListItems = async (): Promise<
  (ProductAttribute["select"] & {
    productCount: number
  })[]
> => {
  const [attributes, countsById] = await Promise.all([getAdminProductAttributesQuery.execute(), getProductCountsByAttributeId()])

  return attributes.map((row) =>
    Object.assign(row, {
      productCount: countsById.get(row.id) ?? 0,
    }),
  )
}
