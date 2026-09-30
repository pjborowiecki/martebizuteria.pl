import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { PRODUCT_ATTRIBUTE_COLUMN_LENGTH } from "~/src/modules/product-attribute/product-attribute.constants"
import { PRODUCT_COLUMN_LENGTH } from "~/src/modules/product/product.constants"

export const ATTRIBUTE_ON_PRODUCT_COLUMN_LENGTH = {
  attributeId: PRODUCT_ATTRIBUTE_COLUMN_LENGTH.id,
  id: UUID_STRING_LENGTH,
  productId: PRODUCT_COLUMN_LENGTH.id,
  value: 4096,
  variantId: UUID_STRING_LENGTH,
} as const

export const ATTRIBUTE_ON_PRODUCT_DEFAULT_RANK = 0

export const ATTRIBUTE_ON_PRODUCT_QUERY_STALE_MS = 60_000

export const ATTRIBUTE_ON_PRODUCT_QUERY_KEYS = {
  BY_PRODUCT_ID: ["attribute-on-product"] as const,
} as const
