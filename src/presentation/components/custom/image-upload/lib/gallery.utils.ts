import { type GalleryImage } from "~/src/presentation/components/custom/image-upload/lib/image-upload.types"

export const reorder = (images: readonly GalleryImage[], fromId: string, toId: string): readonly GalleryImage[] => {
  const fromIndex = images.findIndex((image) => image.id === fromId)
  const toIndex = images.findIndex((image) => image.id === toId)
  const moved = images[fromIndex]
  if (moved === undefined || toIndex === -1 || fromIndex === toIndex) {
    return images
  }

  return images.toSpliced(fromIndex, 1).toSpliced(toIndex, 0, moved)
}
