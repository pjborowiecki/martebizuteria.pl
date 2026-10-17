import zod from "zod/v4"

export const isAcceptedImageMime = (value: string): boolean => (ACCEPTED_IMAGE_MIME_TYPES as readonly string[]).includes(value)

export const ACCEPTED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const

export const ACCEPTED_IMAGE_ACCEPT_ATTR = ACCEPTED_IMAGE_MIME_TYPES.join(",")

const BYTES_PER_KIB = 1024

const MAX_IMAGE_MIB = 5

export const MAX_IMAGE_BYTES = MAX_IMAGE_MIB * BYTES_PER_KIB * BYTES_PER_KIB

export const MAX_IMAGE_NAME_LENGTH = 255

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

const toMediaFolder = (value: unknown): MediaFolder => MEDIA_FOLDERS.find((folder) => folder === value) ?? "uploads"

const imageFileSchema = zod
  .instanceof(File, { error: MEDIA_ERROR_CODES.INVALID_FILE })
  .refine((file) => file.name.length <= MAX_IMAGE_NAME_LENGTH, { error: MEDIA_ERROR_CODES.INVALID_FILE })
  .refine((file) => isAcceptedImageMime(file.type), { error: MEDIA_ERROR_CODES.INVALID_TYPE })
  .refine((file) => file.size > 0 && file.size <= MAX_IMAGE_BYTES, { error: MEDIA_ERROR_CODES.TOO_LARGE })

export const uploadImageInputSchema = zod
  .instanceof(FormData, { error: MEDIA_ERROR_CODES.INVALID_FILE })
  .transform((data) => ({ file: data.get("file"), folder: toMediaFolder(data.get("folder")) }))
  .pipe(zod.object({ file: imageFileSchema, folder: zod.enum(MEDIA_FOLDERS) }))
