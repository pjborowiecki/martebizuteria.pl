import { and, eq, gte, sql } from "drizzle-orm"

import { runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { inJsonList } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { inventory } from "~/src/modules/inventory/inventory.schema"
import { productVariant } from "~/src/modules/product-variant/product-variant.schema"
import { PRODUCT_STATUS } from "~/src/modules/product/product.constants"
import { product } from "~/src/modules/product/product.schema"

interface InventoryRowQuantity {
  inventoryId: string
  qty: number
}

export const inventoryReleaseValues = (qty: number) => ({
  quantityAvailable: sql`${inventory.quantityAvailable} + min(${inventory.quantityReserved}, ${qty})`,
  quantityReserved: sql`max(0, ${inventory.quantityReserved} - ${qty})`,
})

export const reserveInventoryRows = async (items: readonly InventoryRowQuantity[]): Promise<ReadonlySet<string>> => {
  const [first, ...rest] = items.map((item) =>
    db
      .update(inventory)
      .set({
        quantityAvailable: sql`${inventory.quantityAvailable} - ${item.qty}`,
        quantityReserved: sql`${inventory.quantityReserved} + ${item.qty}`,
      })
      .where(and(eq(inventory.id, item.inventoryId), gte(inventory.quantityAvailable, item.qty)))
      .returning({ id: inventory.id }),
  )
  if (first === undefined) {
    return new Set()
  }

  const results = await db.batch([first, ...rest])

  return new Set(results.flat().map((row) => row.id))
}

export const releaseInventoryForItems = (items: InventoryRowQuantity[]): Promise<void> =>
  runDrizzleBatch(items.map((item) => db.update(inventory).set(inventoryReleaseValues(item.qty)).where(eq(inventory.id, item.inventoryId))))

export const getInventoryIdsByVariantIds = async (variantIds: readonly string[]): Promise<ReadonlyMap<string, string>> => {
  if (variantIds.length === 0) {
    return new Map()
  }

  const rows = await db
    .select({ id: inventory.id, variantId: inventory.variantId })
    .from(inventory)
    .where(inJsonList(inventory.variantId, variantIds))

  return new Map(rows.map((row) => [row.variantId, row.id]))
}

export const getAvailabilityByVariantIds = async (variantIds: readonly string[]): Promise<Map<string, number>> => {
  if (variantIds.length === 0) {
    return new Map()
  }

  const rows = await db
    .select({
      quantityAvailable: inventory.quantityAvailable,
      variantId: inventory.variantId,
    })
    .from(inventory)
    .innerJoin(productVariant, eq(productVariant.id, inventory.variantId))
    .innerJoin(product, eq(product.id, productVariant.productId))
    .where(and(inJsonList(inventory.variantId, variantIds), eq(product.status, PRODUCT_STATUS.PUBLISHED)))
  return new Map(rows.map((row) => [row.variantId, row.quantityAvailable]))
}
