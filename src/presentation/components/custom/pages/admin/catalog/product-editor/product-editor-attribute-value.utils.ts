import { PRODUCT_ATTRIBUTE_TYPE } from "~/src/modules/product-attribute/product-attribute.constants"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import { parseMultiselectStoredValue } from "~/src/modules/product-attribute/product-attribute.utils"

import { type ProductEditorAttributeDefinition } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-attribute-value-input"

export const isProductAttributeValueComplete = (definition: ProductEditorAttributeDefinition | undefined, rawValue: string): boolean => {
  const trimmed = rawValue.trim()
  if (trimmed === "") {
    return false
  }

  const type = definition?.type ?? PRODUCT_ATTRIBUTE_TYPE.TEXT
  if (type === PRODUCT_ATTRIBUTE_TYPE.BOOLEAN) {
    return trimmed === "true" || trimmed === "false"
  }

  if (type === PRODUCT_ATTRIBUTE_TYPE.MULTISELECT) {
    return parseMultiselectStoredValue(trimmed).length > MIN_MULTISELECT_SELECTIONS
  }

  return true
}

export const toProductEditorAttributeDefinition = (
  attribute: ProductAttribute["select"] | undefined,
): ProductEditorAttributeDefinition | undefined => {
  if (attribute === undefined) {
    return undefined
  }

  return {
    allowedValues: attribute.allowedValues,
    type: attribute.type,
    unit: attribute.unit,
  }
}

const MIN_MULTISELECT_SELECTIONS = 0
