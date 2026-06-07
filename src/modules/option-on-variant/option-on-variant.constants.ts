import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils";

export const OPTION_ON_VARIANT_COLUMN_LENGTH = {
  id: UUID_STRING_LENGTH,
  optionId: UUID_STRING_LENGTH,
  valueId: UUID_STRING_LENGTH,
  variantId: UUID_STRING_LENGTH
} as const;
