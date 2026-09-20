import { v7 as uuidv7 } from "uuid"

import { type productImage } from "~/src/modules/product-image/product-image.schema"

/** SQL NULL and an omitted variant id both identify product-level images. */
export const isProductLevelImage = (variantId: string | null | undefined): boolean => variantId === undefined || variantId === null

export const galleryImagesToReplacePayload = (
  images: readonly ProductImageFormRow[],
  mainImageId: string | undefined,
  variantId?: string,
): ProductImageInput[] => {
  const mainIndex = images.findIndex((image) => image.id === mainImageId)
  const mainImage = images[mainIndex]
  const ordered = mainImage === undefined ? images : [mainImage, ...images.filter((_, index) => index !== mainIndex)]
  return ordered.map((image, rank) => ({
    alt: image.alt === "" ? undefined : image.alt,
    id: image.id,
    rank,
    url: image.url,
    variantId,
  }))
}
export const buildProductImageRows = (productId: string, images: readonly ProductImageInput[]): (typeof productImage.$inferInsert)[] =>
  images.map((image) => ({
    alt: image.alt === "" ? undefined : image.alt,
    id: image.id ?? uuidv7(),
    productId,
    rank: image.rank,
    url: image.url,
    variantId: image.variantId,
  }))

export interface ProductImageFormRow {
  readonly alt: string
  readonly id: string
  readonly url: string
}
export interface ProductImageInput {
  alt?: string | undefined
  id?: string | undefined
  rank: number
  url: string
  variantId?: string | undefined
}
