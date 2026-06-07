import { productImageAccessors } from "~/src/modules/product-image/product-image.accessors";
import { buildProductImageRows, type ProductImageInput } from "~/src/modules/product-image/product-image.utils";

const EMPTY_LENGTH = 0;

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
