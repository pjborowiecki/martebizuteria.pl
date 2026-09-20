export const isMediaFolder = (value: unknown): value is MediaFolder =>
  typeof value === "string" && (MEDIA_FOLDERS as readonly string[]).includes(value)

export const isAcceptedImageMime = (value: string): boolean => (ACCEPTED_IMAGE_MIME_TYPES as readonly string[]).includes(value)

export const ACCEPTED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const

export const ACCEPTED_IMAGE_ACCEPT_ATTR = ACCEPTED_IMAGE_MIME_TYPES.join(",")
const BYTES_PER_KIB = 1024
const MAX_IMAGE_MIB = 5
export const MAX_IMAGE_BYTES = MAX_IMAGE_MIB * BYTES_PER_KIB * BYTES_PER_KIB

export const MEDIA_FOLDERS = ["collections", "products", "categories", "uploads"] as const

export const MIME_EXTENSION: Readonly<Record<string, string>> = {
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}
export const MEDIA_ERROR_CODES = {
  INVALID_FILE: "INVALID_FILE",
  INVALID_TYPE: "INVALID_TYPE",
  TOO_LARGE: "TOO_LARGE",
  UNAUTHORIZED: "UNAUTHORIZED",
} as const
export type MediaFolder = (typeof MEDIA_FOLDERS)[number]
