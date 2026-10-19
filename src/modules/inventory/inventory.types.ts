import { type inventory } from "~/src/modules/inventory/inventory.schema"
import { type productVariant } from "~/src/modules/product-variant/product-variant.schema"

export type VariantWithInventory = typeof productVariant.$inferSelect & {
  readonly inventory?: typeof inventory.$inferSelect | null
}

export interface ReserveInventoryItem {
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
