import { slugify as slugifyCatalogHandle } from "~/src/components/custom/pages/admin/catalog/form/lib/catalog-slug.utils";

import type { ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types";
import {
  coerceProductAttributeLocaleMap,
  createEmptyProductAttributeLocaleMap
} from "~/src/modules/product-attribute/product-attribute.utils";
import { productAttributeAllowedValueSchema } from "~/src/modules/product-attribute/product-attribute.zod";

export { PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS } from "~/src/modules/product-attribute/product-attribute.constants";

function normalizeAllowedValues(allowedValues: unknown): ProductAttribute["formValues"]["allowedValues"] {
  if (!Array.isArray(allowedValues)) {
    return [];
  }

  const normalized: ProductAttribute["formValues"]["allowedValues"] = [];

  for (const entry of allowedValues) {
    const parsed = productAttributeAllowedValueSchema.safeParse(entry);
    if (parsed.success) {
      normalized.push(parsed.data);
    }
  }

  return normalized;
}

/** Maps a list row into the shared create/edit form shape. */
export function attributeToFormValues(
  attribute: ProductAttribute["select"] | ProductAttribute["adminListItem"]
): ProductAttribute["formValues"] {
  return {
    allowedValues: normalizeAllowedValues(attribute.allowedValues),
    handle: attribute.handle,
    titles: coerceProductAttributeLocaleMap(attribute.titles),
    type: attribute.type,
    unit: attribute.unit ?? ""
  };
}

export function createDefaultAttributeFormValues(): ProductAttribute["formValues"] {
  return {
    allowedValues: [],
    handle: "",
    titles: createEmptyProductAttributeLocaleMap(),
    type: "text",
    unit: ""
  };
}

/** Normalizes free text into a lowercase, hyphen-separated handle. */
export function slugifyHandle(value: string): string {
  return slugifyCatalogHandle(value);
}
