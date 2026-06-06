import type { GalleryImage } from "~/src/components/custom/image-upload/lib/image-upload.types";

const EMPTY_LENGTH = 0;
const FIRST_INDEX = 0;
const NOT_FOUND_INDEX = -1;

export interface ProductImageFormRow {
  readonly alt: string;
  readonly id: string;
  readonly url: string;
}

export function galleryImagesToReplacePayload(
  images: readonly ProductImageFormRow[],
  mainImageId: string | undefined
): { alt?: string; id?: string; rank: number; url: string }[] {
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
    url: image.url
  }));
}

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
