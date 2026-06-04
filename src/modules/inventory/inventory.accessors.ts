import { and, eq, gte, sql } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { inventory } from "~/src/modules/inventory/inventory.schema";

const EMPTY_COUNT = 0;

interface ReleaseInventoryItem {
  inventoryId: string;
  qty: number;
}

interface ReserveInventoryInput {
  currentVersion: number;
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

const releaseInventoryStmt = db
  .update(inventory)
  .set({
    quantityAvailable: sql`${inventory.quantityAvailable} + ${sql.placeholder("qty")}`,
    quantityReserved: sql`max(0, ${inventory.quantityReserved} - ${sql.placeholder("qty")})`,
    version: sql`${inventory.version} + 1`
  })
  .where(eq(inventory.id, sql.placeholder("inventoryId")))
  .prepare();

async function reserveInventory(input: ReserveInventoryInput): Promise<boolean> {
  const result = await reserveInventoryStmt.execute({
    currentVersion: input.currentVersion,
    inventoryId: input.inventoryId,
    qty: input.qty
  });
  return result.length > EMPTY_COUNT;
}

async function releaseInventoryForItems(items: ReleaseInventoryItem[]): Promise<void> {
  if (items.length === EMPTY_COUNT) {
    return;
  }

  await Promise.all(items.map((item) => releaseInventoryStmt.execute({ inventoryId: item.inventoryId, qty: item.qty })));
}

export const inventoryAccessors = {
  releaseInventoryForItems,
  reserveInventory
};
