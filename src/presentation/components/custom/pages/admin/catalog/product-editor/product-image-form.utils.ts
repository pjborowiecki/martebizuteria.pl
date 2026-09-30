import { type GalleryImage } from "~/src/presentation/components/custom/image-upload/lib/image-upload.types"

export const productImagesToGallery = (
  images: readonly {
    readonly id: string
    readonly url: string
  }[],
): GalleryImage[] =>
  images.map((image) => ({
    id: image.id,
    url: image.url,
  }))

export const resolveMainImageId = (
  images: readonly {
    readonly id: string
    readonly url: string
  }[],
  thumbnail: string | null | undefined,
): string | undefined => {
  if (images.length === 0) {
    return undefined
  }

  const match = thumbnail === undefined || thumbnail === null ? undefined : images.find((image) => image.url === thumbnail)

  return match?.id ?? images[0]?.id
}
