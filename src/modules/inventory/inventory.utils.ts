import { inventoryAccessors } from "~/src/modules/inventory/inventory.accessors";

const EMPTY_COUNT = 0;
const FIRST_INDEX = 0;

export interface ReserveInventoryItem {
  currentVersion: number;
  inventoryId: string;
  qty: number;
  title: string;
}

export interface ReleaseInventoryItem {
  inventoryId: string;
  qty: number;
}

/**
 * Reserves stock for every line item using optimistic concurrency (a version
 * guard). D1 has no interactive transactions, so reservations can't be wrapped
 * in a single atomic write; instead, if any item fails the version/stock check
 * the already-reserved items are released before throwing, leaving inventory
 * unchanged on failure.
 */
export async function reserveInventoryForItems(items: ReserveInventoryItem[]): Promise<void> {
  const outcomes = await Promise.all(
    items.map(async (item) => {
      const reserved = await inventoryAccessors.reserveInventory(item);
      return { item, reserved };
    })
  );

  const failures = outcomes.filter((outcome) => !outcome.reserved);

  if (failures.length > EMPTY_COUNT) {
    const reserved = outcomes.filter((outcome) => outcome.reserved).map((outcome) => outcome.item);
    await inventoryAccessors.releaseInventoryForItems(reserved).catch((error: unknown) => {
      console.error("Failed to roll back partial inventory reservation:", error);
    });

    const firstFailure = failures[FIRST_INDEX];
    throw new Error(`Inventory reservation failed for ${firstFailure?.item.title ?? "item"}. Stock changed or unavailable.`);
  }
}
