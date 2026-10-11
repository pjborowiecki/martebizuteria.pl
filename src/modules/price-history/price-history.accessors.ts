import { asc } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { inJsonList } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { priceHistory } from "~/src/modules/price-history/price-history.schema"
import { type PriceReduction, type PricedVariant } from "~/src/modules/price-history/price-history.types"
import { attachPriceReductions, findPriceReduction, isPriceReduced } from "~/src/modules/price-history/price-history.utils"

export const getPriceReductions = async (variants: readonly PricedVariant[]): Promise<ReadonlyMap<string, PriceReduction>> => {
  const reducedVariants = variants.filter((variant) => isPriceReduced(variant))
  if (reducedVariants.length === 0) {
    return new Map()
  }

  const history = await db
    .select()
    .from(priceHistory)
    .where(
      inJsonList(
        priceHistory.variantId,
        reducedVariants.map((variant) => variant.id),
      ),
    )
    .orderBy(asc(priceHistory.variantId), asc(priceHistory.id))

  return new Map(
    reducedVariants.flatMap((variant): [string, PriceReduction][] => {
      const priceReduction = findPriceReduction(
        variant.price,
        history.filter((entry) => entry.variantId === variant.id),
      )

      return priceReduction === undefined ? [] : [[variant.id, priceReduction]]
    }),
  )
}

export const withPriceReductions = async <TVariant extends PricedVariant, TProduct>(
  products: readonly (TProduct & { readonly variants: readonly TVariant[] })[],
) => {
  const priceReductions = await getPriceReductions(products.flatMap((item) => item.variants))

  return products.map((item) => attachPriceReductions(item, priceReductions))
}
