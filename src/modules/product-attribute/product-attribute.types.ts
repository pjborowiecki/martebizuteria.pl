import type { z } from "zod/v4";

import type { Locale } from "~/src/constants/types";

import type { productAttribute } from "~/src/modules/product-attribute/product-attribute.schema";
import type { productAttributeFormSchema, productAttributeZodSchemas } from "~/src/modules/product-attribute/product-attribute.zod";

export type ProductAttributeLocaleCode = Locale;

export type ProductAttributeLocaleMap = Record<ProductAttributeLocaleCode, string>;

export interface ProductAttributeAllowedValue {
  readonly labels: ProductAttributeLocaleMap;
  /** Stable key stored on `attribute_on_product.value` (matched in the storefront). */
  readonly value: string;
}

export interface ProductAttribute {
  adminListItem: z.infer<(typeof productAttributeZodSchemas)["adminListItem"]>;
  formValues: z.infer<ReturnType<typeof productAttributeFormSchema>>;
  insert: typeof productAttribute.$inferInsert;
  select: typeof productAttribute.$inferSelect;
  stats: z.infer<(typeof productAttributeZodSchemas)["stats"]>;
}
