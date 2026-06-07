import { sql, type SQL } from "drizzle-orm";

import {
  PRODUCT_MULTI_VARIANT_COUNT_THRESHOLD,
  PRODUCT_VARIANT_KIND,
  type ProductVariantKind
} from "~/src/modules/product/product.constants";

export function buildAdminVariantKindFilterSql(variantKind: ProductVariantKind | undefined, variantCountColumn: SQL): SQL | undefined {
  if (variantKind === undefined) {
    return undefined;
  }

  if (variantKind === PRODUCT_VARIANT_KIND.MULTI) {
    return sql`coalesce(${variantCountColumn}, 0) > ${PRODUCT_MULTI_VARIANT_COUNT_THRESHOLD}`;
  }

  return sql`coalesce(${variantCountColumn}, 0) <= ${PRODUCT_MULTI_VARIANT_COUNT_THRESHOLD}`;
}
