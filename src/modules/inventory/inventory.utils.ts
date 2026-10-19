import { type ReserveInventoryVariantLine, type VariantWithInventory } from "~/src/modules/inventory/inventory.types"

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

export const sumHeldQuantity = (heldLines: readonly ReserveInventoryVariantLine[], variantId: string): number =>
  heldLines.reduce((total, line) => (line.variantId === variantId ? total + line.qty : total), 0)

export const quantitiesBeyond = <Line extends ReserveInventoryVariantLine>(
  lines: readonly Line[],
  baselineLines: readonly ReserveInventoryVariantLine[],
): Line[] =>
  lines.flatMap((line, index) => {
    const baselineLeft = Math.max(
      0,
      sumHeldQuantity(baselineLines, line.variantId) - sumHeldQuantity(lines.slice(0, index), line.variantId),
    )

    return line.qty > baselineLeft ? [{ ...line, qty: line.qty - baselineLeft }] : []
  })
