import type { inventory } from "~/src/modules/inventory/inventory.schema";
import type { productVariant } from "~/src/modules/product-variant/product-variant.schema";

const ZERO_AVAILABLE = 0;

export type VariantWithInventory = typeof productVariant.$inferSelect & {
  readonly inventory?: typeof inventory.$inferSelect | null;
};

export function getVariantQuantityAvailable(variant: VariantWithInventory | undefined): number {
  return variant?.inventory?.quantityAvailable ?? ZERO_AVAILABLE;
}

export function isVariantPurchasable(variant: VariantWithInventory | undefined, quantity: number): boolean {
  if (quantity <= ZERO_AVAILABLE) {
    return false;
  }

  return getVariantQuantityAvailable(variant) >= quantity;
}

export function resolveProductTotalAvailableStock(variants: readonly VariantWithInventory[]): number {
  return variants.reduce((sum, variant) => sum + getVariantQuantityAvailable(variant), ZERO_AVAILABLE);
}

export function isProductInStock(variants: readonly VariantWithInventory[]): boolean {
  return resolveProductTotalAvailableStock(variants) > ZERO_AVAILABLE;
}
