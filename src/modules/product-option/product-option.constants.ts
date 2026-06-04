import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils";

import { PRODUCT_COLUMN_LENGTH } from "~/src/modules/product/product.constants";

export const PRODUCT_OPTION_COLUMN_LENGTH = {
  id: UUID_STRING_LENGTH,
  productId: PRODUCT_COLUMN_LENGTH.id,
  title: PRODUCT_COLUMN_LENGTH.optionTitle
} as const;
