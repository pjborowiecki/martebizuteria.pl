import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils";

import { PRODUCT_COLUMN_LENGTH } from "~/src/modules/product/product.constants";

export const OPTION_ON_VARIANT_COLUMN_LENGTH = {
  id: UUID_STRING_LENGTH,
  optionId: UUID_STRING_LENGTH,
  value: PRODUCT_COLUMN_LENGTH.optionValue,
  variantId: UUID_STRING_LENGTH
} as const;
