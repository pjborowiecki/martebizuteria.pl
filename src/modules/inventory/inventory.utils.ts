import { getInventoryByVariantIds, releaseInventoryForItems, reserveInventoryRows } from "~/src/modules/inventory/inventory.accessors"

export interface ReserveInventoryItem {
  currentVersion: number
  inventoryId: string
  qty: number
  title: string
}

export interface ReleaseInventoryItem {
  inventoryId: string
  qty: number
}

export interface ReserveInventoryVariantLine {
  qty: number
  variantId: string
}

const mergeLinesByInventory = (items: readonly ReserveInventoryItem[]): ReserveInventoryItem[] => {
  const merged = new Map<string, ReserveInventoryItem>()
  for (const item of items) {
    const existing = merged.get(item.inventoryId)
    merged.set(item.inventoryId, existing === undefined ? item : { ...existing, qty: existing.qty + item.qty })
  }

  return [...merged.values()]
}

export const reserveInventoryForItems = async (items: readonly ReserveInventoryItem[]): Promise<void> => {
  const lines = mergeLinesByInventory(items)
  const reservedIds = await reserveInventoryRows(lines)

  const firstFailure = lines.find((line) => !reservedIds.has(line.inventoryId))
  if (firstFailure !== undefined) {
    const reserved = lines.filter((line) => reservedIds.has(line.inventoryId))
    await releaseInventoryForItems(reserved).catch((error: unknown) => {
      console.error("Failed to roll back partial inventory reservation:", error)
    })

    throw new Error(`Inventory reservation failed for ${firstFailure.title}. Stock changed or unavailable.`)
  }
}

export const reserveInventoryByVariantLines = async (lines: readonly ReserveInventoryVariantLine[]): Promise<void> => {
  const inventories = await getInventoryByVariantIds(lines.map((line) => line.variantId))
  const items = lines.map((line) => {
    const inv = inventories.get(line.variantId)
    if (inv === undefined) {
      throw new Error(`Inventory not found for variant ${line.variantId}.`)
    }

    return {
      currentVersion: inv.version,
      inventoryId: inv.id,
      qty: line.qty,
      title: line.variantId,
    }
  })
  await reserveInventoryForItems(items)
}
