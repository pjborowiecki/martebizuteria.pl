import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils"

export const PRICE_HISTORY_COLUMN_LENGTH = {
  variantId: UUID_STRING_LENGTH,
} as const

const LOWEST_PRICE_LOOKBACK_DAYS = 30

const MS_PER_DAY = 86_400_000

export const LOWEST_PRICE_LOOKBACK_MS = LOWEST_PRICE_LOOKBACK_DAYS * MS_PER_DAY
