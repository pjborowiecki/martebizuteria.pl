import { EMPTY_COUNT, NOT_FOUND_INDEX, REMOVE_ONE } from "~/src/presentation/components/custom/image-upload/constants"
import { type GalleryImage } from "~/src/presentation/components/custom/image-upload/lib/image-upload.types"

/** Moves `fromId` into the position currently held by `toId`. */
export const reorder = (images: readonly GalleryImage[], fromId: string, toId: string): readonly GalleryImage[] => {
  const fromIndex = images.findIndex((image) => image.id === fromId)
  const toIndex = images.findIndex((image) => image.id === toId)
  const moved = images[fromIndex]
  if (moved === undefined || toIndex === NOT_FOUND_INDEX || fromIndex === toIndex) {
    return images
  }
  return images.toSpliced(fromIndex, REMOVE_ONE).toSpliced(toIndex, EMPTY_COUNT, moved)
}
