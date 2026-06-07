import type { GalleryImage } from "~/src/components/custom/image-upload/lib/image-upload.types";

import type { ProductImageFormRow } from "~/src/modules/product-image/product-image.utils";

export type { ProductImageFormRow };

const EMPTY_LENGTH = 0;
const FIRST_INDEX = 0;

export function productImagesToGallery(images: readonly { readonly id: string; readonly url: string }[]): GalleryImage[] {
  return images.map((image) => ({ id: image.id, url: image.url }));
}

export function resolveMainImageId(
  images: readonly { readonly id: string; readonly url: string }[],
  thumbnail: string | null | undefined
): string | undefined {
  if (images.length === EMPTY_LENGTH) {
    return undefined;
  }

  const match = thumbnail === undefined || thumbnail === null ? undefined : images.find((image) => image.url === thumbnail);
  return match?.id ?? images[FIRST_INDEX]?.id;
}
