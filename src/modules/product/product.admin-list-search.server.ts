import { inArray, or, sql, type SQL } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { buildAdminLikePattern, buildAdminSearchOrCondition, normalizeAdminSearchTerm } from "~/src/lib/_utils/admin-search.server";

import { productVariant } from "~/src/modules/product-variant/product-variant.schema";
import { product } from "~/src/modules/product/product.schema";

export function buildAdminProductSearchCondition(search: string | undefined): SQL | undefined {
  const normalized = normalizeAdminSearchTerm(search);
  if (normalized === undefined) {
    return undefined;
  }

  const pattern = buildAdminLikePattern(normalized);
  const textMatch = buildAdminSearchOrCondition(normalized, [
    product.handle,
    product.id,
    product.titles,
    product.subtitles,
    product.descriptions
  ]);
  const skuMatch = inArray(
    product.id,
    db
      .select({ id: productVariant.productId })
      .from(productVariant)
      .where(sql`${productVariant.sku} like ${pattern}`)
  );

  if (textMatch === undefined) {
    return skuMatch;
  }

  return or(textMatch, skuMatch);
}
