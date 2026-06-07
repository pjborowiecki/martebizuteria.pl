import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils";

import { PRODUCT_COLUMN_LENGTH } from "~/src/modules/product/product.constants";

export const PRODUCT_OPTION_VALUE_COLUMN_LENGTH = {
  id: UUID_STRING_LENGTH,
  optionId: UUID_STRING_LENGTH
} as const;

export const PRODUCT_OPTION_VALUE_DEFAULT_RANK = 0;

export const PRODUCT_OPTION_VALUE_LABEL_MAX_LENGTH = PRODUCT_COLUMN_LENGTH.optionValue;
