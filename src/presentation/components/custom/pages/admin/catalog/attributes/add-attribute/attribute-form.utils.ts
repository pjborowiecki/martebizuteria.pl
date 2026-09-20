import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import {
  coerceProductAttributeLocaleMap,
  createEmptyProductAttributeLocaleMap,
} from "~/src/modules/product-attribute/product-attribute.utils"
import { productAttributeAllowedValueSchema } from "~/src/modules/product-attribute/product-attribute.zod"

const normalizeAllowedValues = (allowedValues: unknown): ProductAttribute["formValues"]["allowedValues"] => {
  if (!Array.isArray(allowedValues)) {
    return []
  }
  const normalized: ProductAttribute["formValues"]["allowedValues"] = []
  for (const entry of allowedValues) {
    const parsed = productAttributeAllowedValueSchema.safeParse(entry)
    if (parsed.success) {
      normalized.push(parsed.data)
    }
  }
  return normalized
}

export const attributeToFormValues = (
  attribute: ProductAttribute["select"] | ProductAttribute["adminListItem"],
): ProductAttribute["formValues"] => ({
  allowedValues: normalizeAllowedValues(attribute.allowedValues),
  handle: attribute.handle,
  titles: coerceProductAttributeLocaleMap(attribute.titles),
  type: attribute.type,
  unit: attribute.unit ?? "",
})
export const createDefaultAttributeFormValues = (): ProductAttribute["formValues"] => ({
  allowedValues: [],
  handle: "",
  titles: createEmptyProductAttributeLocaleMap(),
  type: "text",
  unit: "",
})

export { PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS } from "~/src/modules/product-attribute/product-attribute.constants"
