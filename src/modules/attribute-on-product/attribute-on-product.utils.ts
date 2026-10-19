import { v7 as uuidv7 } from "uuid"

import { type attributeOnProduct } from "~/src/modules/attribute-on-product/attribute-on-product.schema"
import { type AttributeOnProductRow } from "~/src/modules/attribute-on-product/attribute-on-product.types"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import { parseProductAttributeValueForType } from "~/src/modules/product-attribute/product-attribute.utils"

interface NormalizeAttributeOnProductRowsInput {
  readonly productAttributes: readonly ProductAttribute["select"][]
  readonly productId: string
  readonly rows: readonly AttributeOnProductRow[]
  readonly variantId?: string
}

export const normalizeAttributeOnProductRows = (
  input: NormalizeAttributeOnProductRowsInput,
): (typeof attributeOnProduct.$inferInsert)[] => {
  const { productAttributes, productId, rows, variantId } = input
  const productAttributeById = new Map(productAttributes.map((entry) => [entry.id, entry]))

  return rows.map((row, index) => {
    const definition = productAttributeById.get(row.attributeId)
    const type = definition?.type ?? "text"

    return {
      attributeId: row.attributeId,
      id: row.id ?? uuidv7(),
      productId,
      rank: row.rank ?? index,
      value: parseProductAttributeValueForType(type, row.value, definition?.allowedValues),
      variantId,
    }
  })
}
