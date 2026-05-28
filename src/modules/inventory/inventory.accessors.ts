import { and, eq, gte, sql } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { inventory } from "~/src/modules/inventory/inventory.schema";

const EMPTY_COUNT = 0;
const FIRST_INDEX = 0;

interface ReserveInventoryItem {
  currentVersion: number;
  inventoryId: string;
  qty: number;
  title: string;
}

interface ReleaseInventoryItem {
  inventoryId: string;
  qty: number;
}

const reserveInventoryStmt = db
  .update(inventory)
  .set({
    quantityAvailable: sql`${inventory.quantityAvailable} - ${sql.placeholder("qty")}`,
    quantityReserved: sql`${inventory.quantityReserved} + ${sql.placeholder("qty")}`,
    version: sql`${inventory.version} + 1`
  })
  .where(
    and(
      eq(inventory.id, sql.placeholder("inventoryId")),
      eq(inventory.version, sql.placeholder("currentVersion")),
      gte(inventory.quantityAvailable, sql.placeholder("qty"))
    )
  )
  .returning()
  .prepare();

// Compensating update: returns reserved units to available stock. Matched by id
// only (no version guard) because it reverses a reservation this request already
// made; `max(0, …)` keeps the counter sane even under concurrent edits.
const releaseInventoryStmt = db
  .update(inventory)
  .set({
    quantityAvailable: sql`${inventory.quantityAvailable} + ${sql.placeholder("qty")}`,
    quantityReserved: sql`max(0, ${inventory.quantityReserved} - ${sql.placeholder("qty")})`,
    version: sql`${inventory.version} + 1`
  })
  .where(eq(inventory.id, sql.placeholder("inventoryId")))
  .prepare();

async function releaseInventoryForItems(items: ReleaseInventoryItem[]): Promise<void> {
  if (items.length === EMPTY_COUNT) {
    return;
  }

  await Promise.all(items.map((item) => releaseInventoryStmt.execute({ inventoryId: item.inventoryId, qty: item.qty })));
}

/**
 * Reserves stock for every line item using optimistic concurrency (a version
 * guard). D1 has no interactive transactions, so reservations can't be wrapped
 * in a single atomic write; instead, if any item fails the version/stock check
 * the already-reserved items are released before throwing, leaving inventory
 * unchanged on failure.
 */
async function reserveInventoryForItems(items: ReserveInventoryItem[]): Promise<void> {
  const outcomes = await Promise.all(
    items.map(async (item) => {
      const result = await reserveInventoryStmt.execute({
        currentVersion: item.currentVersion,
        inventoryId: item.inventoryId,
        qty: item.qty
      });
      return { item, reserved: result.length > EMPTY_COUNT };
    })
  );

  const failures = outcomes.filter((outcome) => !outcome.reserved);

  if (failures.length > EMPTY_COUNT) {
    const reserved = outcomes.filter((outcome) => outcome.reserved).map((outcome) => outcome.item);
    await releaseInventoryForItems(reserved).catch((error: unknown) => {
      console.error("Failed to roll back partial inventory reservation:", error);
    });

    const firstFailure = failures[FIRST_INDEX];
    throw new Error(`Inventory reservation failed for ${firstFailure?.item.title ?? "item"}. Stock changed or unavailable.`);
  }
}

export const inventoryAccessors = {
  releaseInventoryForItems,
  reserveInventoryForItems
};
