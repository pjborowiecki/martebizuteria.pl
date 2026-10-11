import { type priceHistory } from "~/src/modules/price-history/price-history.schema"

export type PriceHistoryEntry = Pick<typeof priceHistory.$inferSelect, "changedAt" | "compareAtPrice" | "price">

export interface PricedVariant {
  readonly compareAtPrice: number | null
  readonly id: string
  readonly price: number
}

export interface PriceReduction {
  readonly lowestPrice: number
}
