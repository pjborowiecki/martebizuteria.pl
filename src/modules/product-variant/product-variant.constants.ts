import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { PRODUCT_COLUMN_LENGTH } from "~/src/modules/product/product.constants"

export const PRODUCT_VARIANT_COLUMN_LENGTH = {
  barcode: PRODUCT_COLUMN_LENGTH.sku,
  id: UUID_STRING_LENGTH,
  productId: PRODUCT_COLUMN_LENGTH.id,
  sku: PRODUCT_COLUMN_LENGTH.sku,
  title: PRODUCT_COLUMN_LENGTH.title,
} as const

export const PRODUCT_VARIANT_DEFAULT_PRICE_MINOR = 0

export const PRODUCT_VARIANT_DEFAULT_MANAGE_INVENTORY = true
