import { type wishlistItem } from "~/src/modules/wishlist/wishlist.schema"

interface WishlistProduct {
  readonly addedAt: Date
  readonly available: boolean
  readonly handle: string
  readonly inStock: boolean
  readonly priceMinorUnits: number
  readonly productId: string
  readonly thumbnail: string | undefined
  readonly title: string
  readonly variantId: string | undefined
  readonly variantTitle: string | undefined
}

export interface Wishlist {
  insert: typeof wishlistItem.$inferInsert
  product: WishlistProduct
  select: typeof wishlistItem.$inferSelect
  toggleResult: { readonly wishlisted: boolean }
}
