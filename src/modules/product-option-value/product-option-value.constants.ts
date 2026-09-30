import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils"

export const PRODUCT_OPTION_VALUE_COLUMN_LENGTH = {
  id: UUID_STRING_LENGTH,
  optionId: UUID_STRING_LENGTH,
} as const

export const PRODUCT_OPTION_VALUE_DEFAULT_RANK = 0
