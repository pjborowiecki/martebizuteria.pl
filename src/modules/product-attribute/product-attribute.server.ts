import { eq, max, sql } from "drizzle-orm"

import { type RankUpdate, chunkRankUpdates, runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { inJsonList } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { getProductCountsByAttributeId } from "~/src/modules/attribute-on-product/attribute-on-product.server"
import { productAttribute } from "~/src/modules/product-attribute/product-attribute.schema"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

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

export const setProductAttributeRanks = async (updates: readonly RankUpdate[]): Promise<void> => {
  await runDrizzleBatch(
    chunkRankUpdates(productAttribute.id, updates).map(({ ids, rank }) =>
      db.update(productAttribute).set({ rank }).where(inJsonList(productAttribute.id, ids)),
    ),
  )
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
    .where(inJsonList(productAttribute.id, ids))
}

export const deleteProductAttributes = async (ids: readonly string[]): Promise<void> => {
  if (ids.length === 0) {
    return
  }
  await db.delete(productAttribute).where(inJsonList(productAttribute.id, ids))
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
