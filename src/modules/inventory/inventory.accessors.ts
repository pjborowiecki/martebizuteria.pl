import { and, eq, gte, sql } from "drizzle-orm"

import { runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { inJsonList } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { inventory } from "~/src/modules/inventory/inventory.schema"

interface ReleaseInventoryItem {
  inventoryId: string
  qty: number
}

interface ReleaseInventoryVariantLine {
  qty: number
  variantId: string
}

interface ReserveInventoryInput {
  currentVersion: number
  inventoryId: string
  qty: number
}

const releaseValues = (qty: number) => ({
  quantityAvailable: sql`${inventory.quantityAvailable} + min(${inventory.quantityReserved}, ${qty})`,
  quantityReserved: sql`max(0, ${inventory.quantityReserved} - ${qty})`,
  version: sql`${inventory.version} + 1`,
})

export const reserveInventoryRows = async (items: readonly ReserveInventoryInput[]): Promise<ReadonlySet<string>> => {
  const [first, ...rest] = items.map((item) =>
    db
      .update(inventory)
      .set({
        quantityAvailable: sql`${inventory.quantityAvailable} - ${item.qty}`,
        quantityReserved: sql`${inventory.quantityReserved} + ${item.qty}`,
        version: sql`${inventory.version} + 1`,
      })
      .where(
        and(eq(inventory.id, item.inventoryId), eq(inventory.version, item.currentVersion), gte(inventory.quantityAvailable, item.qty)),
      )
      .returning({ id: inventory.id }),
  )
  if (first === undefined) {
    return new Set()
  }

  const results = await db.batch([first, ...rest])

  return new Set(results.flat().map((row) => row.id))
}

export const releaseInventoryForItems = (items: ReleaseInventoryItem[]): Promise<void> =>
  runDrizzleBatch(items.map((item) => db.update(inventory).set(releaseValues(item.qty)).where(eq(inventory.id, item.inventoryId))))

export const releaseInventoryByVariantLines = (lines: ReleaseInventoryVariantLine[]): Promise<void> =>
  runDrizzleBatch(lines.map((line) => db.update(inventory).set(releaseValues(line.qty)).where(eq(inventory.variantId, line.variantId))))

export const getInventoryByVariantIds = async (
  variantIds: readonly string[],
): Promise<ReadonlyMap<string, { readonly id: string; readonly version: number }>> => {
  if (variantIds.length === 0) {
    return new Map()
  }

  const rows = await db
    .select({ id: inventory.id, variantId: inventory.variantId, version: inventory.version })
    .from(inventory)
    .where(inJsonList(inventory.variantId, variantIds))

  return new Map(rows.map((row) => [row.variantId, { id: row.id, version: row.version }]))
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
    .where(inJsonList(inventory.variantId, variantIds))
  return new Map(rows.map((row) => [row.variantId, row.quantityAvailable]))
}
