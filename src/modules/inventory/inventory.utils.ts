import { getInventoryByVariantId, releaseInventoryForItems, reserveInventory } from "~/src/modules/inventory/inventory.accessors"

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

/**
 * Reserves stock for every line item using optimistic concurrency (a version
 * guard). D1 has no interactive transactions, so reservations can't be wrapped
 * in a single atomic write; instead, if any item fails the version/stock check
 * the already-reserved items are released before throwing, leaving inventory
 * unchanged on failure.
 */
export const reserveInventoryForItems = async (items: ReserveInventoryItem[]): Promise<void> => {
  const outcomes = await Promise.all(
    items.map(async (item) => {
      const reserved = await reserveInventory(item)
      return {
        item,
        reserved,
      }
    }),
  )
  const failures = outcomes.filter((outcome) => !outcome.reserved)
  if (failures.length > 0) {
    const reserved = outcomes.filter((outcome) => outcome.reserved).map((outcome) => outcome.item)
    await releaseInventoryForItems(reserved).catch((error: unknown) => {
      console.error("Failed to roll back partial inventory reservation:", error)
    })
    const [firstFailure] = failures
    throw new Error(`Inventory reservation failed for ${firstFailure?.item.title ?? "item"}. Stock changed or unavailable.`)
  }
}

/** Re-reserves stock by variant id (e.g. rolling back a failed checkout session update). */
export const reserveInventoryByVariantLines = async (lines: ReserveInventoryVariantLine[]): Promise<void> => {
  const inventories = await Promise.all(lines.map((line) => getInventoryByVariantId(line.variantId)))
  const items = lines.map((line, index) => {
    const inv = inventories[index]
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
