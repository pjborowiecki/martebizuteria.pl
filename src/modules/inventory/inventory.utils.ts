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

  const firstFailure = outcomes.find((outcome) => !outcome.reserved)
  if (firstFailure !== undefined) {
    const reserved = outcomes.filter((outcome) => outcome.reserved).map((outcome) => outcome.item)
    await releaseInventoryForItems(reserved).catch((error: unknown) => {
      console.error("Failed to roll back partial inventory reservation:", error)
    })

    throw new Error(`Inventory reservation failed for ${firstFailure.item.title}. Stock changed or unavailable.`)
  }
}

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
