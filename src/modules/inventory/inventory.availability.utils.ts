import { type inventory } from "~/src/modules/inventory/inventory.schema"
import { type productVariant } from "~/src/modules/product-variant/product-variant.schema"

export type VariantWithInventory = typeof productVariant.$inferSelect & {
  readonly inventory?: typeof inventory.$inferSelect | null
}

export const getVariantQuantityAvailable = (variant: VariantWithInventory | undefined): number => variant?.inventory?.quantityAvailable ?? 0

export const isVariantPurchasable = (variant: VariantWithInventory | undefined, quantity: number): boolean => {
  if (quantity <= 0) {
    return false
  }

  return getVariantQuantityAvailable(variant) >= quantity
}

export const resolveProductTotalAvailableStock = (variants: readonly VariantWithInventory[]): number =>
  variants.reduce((sum, variant) => sum + getVariantQuantityAvailable(variant), 0)

export const isProductInStock = (variants: readonly VariantWithInventory[]): boolean => resolveProductTotalAvailableStock(variants) > 0
