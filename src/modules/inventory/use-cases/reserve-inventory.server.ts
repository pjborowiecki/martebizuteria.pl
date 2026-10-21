import { scheduleProductCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"
import { CHECKOUT_ERROR_CODES } from "~/src/integrations/stripe/stripe.errors"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { releaseInventoryForItems, reserveInventoryRows } from "~/src/modules/inventory/inventory.accessors"
import { type ReserveInventoryItem } from "~/src/modules/inventory/inventory.types"

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
    scheduleProductCatalogInvalidation()

    console.warn(`Inventory reservation failed for ${firstFailure.title}. Not enough stock available.`)
    throw new AppError(ERROR_CODES.CONFLICT, CHECKOUT_ERROR_CODES.INSUFFICIENT_INVENTORY)
  }
}
