import { and, eq, gte, sql } from "drizzle-orm"

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

const inventoryIdPlaceholder = sql.placeholder("inventoryId")

const currentVersionPlaceholder = sql.placeholder("currentVersion")

const qtyPlaceholder = sql.placeholder("qty")

const reserveInventoryStmt = db
  .update(inventory)
  .set({
    quantityAvailable: sql`${inventory.quantityAvailable} - ${qtyPlaceholder}`,
    quantityReserved: sql`${inventory.quantityReserved} + ${qtyPlaceholder}`,
    version: sql`${inventory.version} + 1`,
  })
  .where(
    and(
      eq(inventory.id, inventoryIdPlaceholder),
      eq(inventory.version, currentVersionPlaceholder),
      gte(inventory.quantityAvailable, qtyPlaceholder),
    ),
  )
  .returning()
  .prepare()

const releaseInventoryStmt = db
  .update(inventory)
  .set({
    quantityAvailable: sql`${inventory.quantityAvailable} + min(${inventory.quantityReserved}, ${qtyPlaceholder})`,
    quantityReserved: sql`max(0, ${inventory.quantityReserved} - ${qtyPlaceholder})`,
    version: sql`${inventory.version} + 1`,
  })
  .where(eq(inventory.id, inventoryIdPlaceholder))
  .prepare()

export const reserveInventory = async (input: ReserveInventoryInput): Promise<boolean> => {
  const result = await reserveInventoryStmt.execute({
    currentVersion: input.currentVersion,
    inventoryId: input.inventoryId,
    qty: input.qty,
  })

  return result.length > 0
}

export const releaseInventoryForItems = async (items: ReleaseInventoryItem[]): Promise<void> => {
  if (items.length === 0) {
    return
  }
  await Promise.all(
    items.map((item) =>
      releaseInventoryStmt.execute({
        inventoryId: item.inventoryId,
        qty: item.qty,
      }),
    ),
  )
}

const releaseInventoryByVariantStmt = db
  .update(inventory)
  .set({
    quantityAvailable: sql`${inventory.quantityAvailable} + min(${inventory.quantityReserved}, ${qtyPlaceholder})`,
    quantityReserved: sql`max(0, ${inventory.quantityReserved} - ${qtyPlaceholder})`,
    version: sql`${inventory.version} + 1`,
  })
  .where(eq(inventory.variantId, sql.placeholder("variantId")))
  .prepare()

export const releaseInventoryByVariantLines = async (lines: ReleaseInventoryVariantLine[]): Promise<void> => {
  if (lines.length === 0) {
    return
  }
  await Promise.all(
    lines.map((line) =>
      releaseInventoryByVariantStmt.execute({
        qty: line.qty,
        variantId: line.variantId,
      }),
    ),
  )
}

export const getInventoryByVariantId = (variantId: string) =>
  db.query.inventory.findFirst({
    where: eq(inventory.variantId, variantId),
  })

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
