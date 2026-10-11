import { LOWEST_PRICE_LOOKBACK_MS } from "~/src/modules/price-history/price-history.constants"
import { type PriceHistoryEntry, type PriceReduction } from "~/src/modules/price-history/price-history.types"

export const isPriceReduced = <TPriced extends Pick<PriceHistoryEntry, "compareAtPrice" | "price">>(
  priced: TPriced,
): priced is TPriced & { readonly compareAtPrice: number } => priced.compareAtPrice !== null && priced.compareAtPrice > priced.price

export const findPriceReduction = (price: number, history: readonly PriceHistoryEntry[]): PriceReduction | undefined => {
  const reductionIndex = history.findLastIndex((entry) => entry.price !== price || !isPriceReduced(entry)) + 1
  const reduction = history.at(reductionIndex)
  if (reduction === undefined || reductionIndex === 0) {
    return undefined
  }

  const lookbackStart = reduction.changedAt.getTime() - LOWEST_PRICE_LOOKBACK_MS
  const beforeReduction = history.slice(0, reductionIndex)
  const inEffectAtLookbackStart = beforeReduction.findLastIndex((entry) => entry.changedAt.getTime() <= lookbackStart)
  const lowestPrice = Math.min(...beforeReduction.filter((_, index) => index >= inEffectAtLookbackStart).map((entry) => entry.price))

  return lowestPrice > price ? { lowestPrice } : undefined
}

export const attachPriceReductions = <TVariant extends { readonly id: string }, TProduct>(
  product: TProduct & { readonly variants: readonly TVariant[] },
  priceReductions: ReadonlyMap<string, PriceReduction>,
) => ({
  ...product,
  variants: product.variants.map((variant) => ({ ...variant, priceReduction: priceReductions.get(variant.id) })),
})
