import { CATEGORY_COLUMN_LENGTH } from "~/src/modules/product-category/product-category.constants"
import { PRODUCT_COLUMN_LENGTH } from "~/src/modules/product/product.constants"

export const CATEGORY_ON_PRODUCT_COLUMN_LENGTH = {
  categoryId: CATEGORY_COLUMN_LENGTH.id,
  productId: PRODUCT_COLUMN_LENGTH.id,
} as const
