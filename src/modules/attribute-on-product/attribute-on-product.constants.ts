import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils";

import { PRODUCT_ATTRIBUTE_COLUMN_LENGTH } from "~/src/modules/product-attribute/product-attribute.constants";
import { PRODUCT_COLUMN_LENGTH } from "~/src/modules/product/product.constants";

export const ATTRIBUTE_ON_PRODUCT_COLUMN_LENGTH = {
  attributeId: PRODUCT_ATTRIBUTE_COLUMN_LENGTH.id,
  id: UUID_STRING_LENGTH,
  productId: PRODUCT_COLUMN_LENGTH.id,
  value: 4096
} as const;

export const ATTRIBUTE_ON_PRODUCT_DEFAULT_RANK = 0;
