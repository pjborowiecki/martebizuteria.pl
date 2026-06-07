import { v7 as uuidv7 } from "uuid";

import type { productImage } from "~/src/modules/product-image/product-image.schema";

const EMPTY_LENGTH = 0;

/** Product-level gallery row (not tied to a variant). Drizzle may surface SQL NULL as `null` or `undefined`. */
export function isProductLevelImage(variantId: string | null | undefined): boolean {
  return variantId === undefined || variantId === null;
}

export interface ProductImageFormRow {
  readonly alt: string;
  readonly id: string;
  readonly url: string;
}

export interface ProductImageInput {
  alt?: string;
  id?: string;
  rank: number;
  url: string;
  variantId?: string;
}

const FIRST_INDEX = 0;
const NOT_FOUND_INDEX = -1;

export function galleryImagesToReplacePayload(
  images: readonly ProductImageFormRow[],
  mainImageId: string | undefined,
  variantId?: string
): ProductImageInput[] {
  if (images.length === EMPTY_LENGTH) {
    return [];
  }

  const mainIndex = mainImageId === undefined ? FIRST_INDEX : images.findIndex((image) => image.id === mainImageId);
  const safeMain = mainIndex === NOT_FOUND_INDEX ? FIRST_INDEX : mainIndex;
  const ordered = safeMain === FIRST_INDEX ? [...images] : [images[safeMain], ...images.filter((_, index) => index !== safeMain)];

  return ordered.map((image, rank) => ({
    alt: image.alt === "" ? undefined : image.alt,
    id: image.id,
    rank,
    url: image.url,
    variantId
  }));
}

export function buildProductImageRows(productId: string, images: readonly ProductImageInput[]): (typeof productImage.$inferInsert)[] {
  return images.map((image) => ({
    alt: image.alt === "" ? undefined : image.alt,
    id: image.id ?? uuidv7(),
    productId,
    rank: image.rank,
    url: image.url,
    variantId: image.variantId
  }));
}
