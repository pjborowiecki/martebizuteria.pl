import { COLLECTION_COLUMN_LENGTH } from "~/src/modules/product-collection/product-collection.constants";
import { PRODUCT_COLUMN_LENGTH } from "~/src/modules/product/product.constants";

export const COLLECTION_ON_PRODUCT_COLUMN_LENGTH = {
  collectionId: COLLECTION_COLUMN_LENGTH.id,
  productId: PRODUCT_COLUMN_LENGTH.id
} as const;
