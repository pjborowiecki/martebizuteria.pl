import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils"

export const INVENTORY_COLUMN_LENGTH = {
  id: UUID_STRING_LENGTH,
  variantId: UUID_STRING_LENGTH,
} as const

export const INVENTORY_DEFAULT_QUANTITY = 0

export const INVENTORY_NON_NEGATIVE_AVAILABLE_CHECK = "inventory_quantity_available_non_negative"
