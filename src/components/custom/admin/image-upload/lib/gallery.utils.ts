import { EMPTY_COUNT, NOT_FOUND_INDEX, REMOVE_ONE } from "~/src/components/custom/admin/image-upload/constants";
import type { GalleryImage } from "~/src/components/custom/admin/image-upload/lib/image-upload.types";

/** Returns a new list with `fromId` moved to the position currently held by `toId`. */
export function reorder(images: readonly GalleryImage[], fromId: string, toId: string): readonly GalleryImage[] {
  const fromIndex = images.findIndex((image) => image.id === fromId);
  const toIndex = images.findIndex((image) => image.id === toId);
  if (fromIndex === NOT_FOUND_INDEX || toIndex === NOT_FOUND_INDEX || fromIndex === toIndex) {
    return images;
  }
  const next = [...images];
  const [moved] = next.splice(fromIndex, REMOVE_ONE);
  next.splice(toIndex, EMPTY_COUNT, moved);
  return next;
}
