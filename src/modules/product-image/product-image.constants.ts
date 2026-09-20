import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils"

export const PRODUCT_IMAGE_COLUMN_LENGTH = {
  alt: 512,
  id: UUID_STRING_LENGTH,
  productId: UUID_STRING_LENGTH,
  url: 2048,
  variantId: UUID_STRING_LENGTH,
} as const

export const PRODUCT_IMAGE_DEFAULT_RANK = 0

export const PRODUCT_IMAGE_QUERY_KEYS = {
  BY_PRODUCT_ID: ["product-images"] as const,
} as const
