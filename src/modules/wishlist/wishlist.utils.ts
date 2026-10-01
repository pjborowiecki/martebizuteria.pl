import { PRODUCT_STATUS } from "~/src/modules/product/product.constants"
import { resolveProductTitle } from "~/src/modules/product/product.utils"
import { type Wishlist } from "~/src/modules/wishlist/wishlist.types"

import { getProductImageUrl } from "~/src/lib/image"

const NO_STOCK = 0

export const toWishlistProduct = (row: WishlistRow, locale: string): Wishlist["product"] => ({
  addedAt: row.addedAt,
  available: row.status === PRODUCT_STATUS.PUBLISHED,
  handle: row.handle,
  inStock: row.totalStock > NO_STOCK,
  priceMinorUnits: row.priceMinorUnits ?? NO_STOCK,
  productId: row.productId,
  thumbnail: row.thumbnail === null ? undefined : getProductImageUrl(row.thumbnail),
  title: resolveProductTitle(row.titles, locale),
  variantId: row.variantId ?? undefined,
  variantTitle: row.variantTitle ?? undefined,
})

interface WishlistRow {
  readonly addedAt: Date
  readonly handle: string
  readonly priceMinorUnits: number | null
  readonly productId: string
  readonly status: string
  readonly thumbnail: string | null
  readonly titles: unknown
  readonly totalStock: number
  readonly variantId: string | null
  readonly variantTitle: string | null
}
