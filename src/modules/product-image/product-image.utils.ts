import { v7 as uuidv7 } from "uuid";

import { productImageAccessors } from "~/src/modules/product-image/product-image.accessors";
import type { productImage } from "~/src/modules/product-image/product-image.schema";

const EMPTY_LENGTH = 0;

export interface ProductImageInput {
  alt?: string;
  id?: string;
  rank: number;
  url: string;
}

export function buildProductImageRows(productId: string, images: readonly ProductImageInput[]): (typeof productImage.$inferInsert)[] {
  return images.map((image) => ({
    alt: image.alt === "" ? undefined : image.alt,
    id: image.id ?? uuidv7(),
    productId,
    rank: image.rank,
    url: image.url
  }));
}

export async function syncProductThumbnail(productId: string): Promise<void> {
  const url = await productImageAccessors.getFirstImageUrl(productId);
  await productImageAccessors.updateProductThumbnail(productId, url);
}

export async function syncThumbnailsForProductIds(productIds: readonly string[]): Promise<void> {
  if (productIds.length === EMPTY_LENGTH) {
    return;
  }

  await Promise.all(productIds.map((productId) => syncProductThumbnail(productId)));
}

export async function replaceProductImages(productId: string, images: readonly ProductImageInput[]): Promise<void> {
  await productImageAccessors.deleteByProductId(productId);

  if (images.length === EMPTY_LENGTH) {
    await syncProductThumbnail(productId);
    return;
  }

  await productImageAccessors.insertRows(buildProductImageRows(productId, images));
  await syncProductThumbnail(productId);
}
