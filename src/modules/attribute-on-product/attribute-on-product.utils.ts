import { eq } from "drizzle-orm"
import { v7 as uuidv7 } from "uuid"
import { type z } from "zod/v4"

import { type DrizzleBatchStatement, insertRowChunks } from "~/src/integrations/drizzle-orm/drizzle.batch"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { attributeOnProduct } from "~/src/modules/attribute-on-product/attribute-on-product.schema"
import { type attributeOnProductZodSchemas } from "~/src/modules/attribute-on-product/attribute-on-product.zod"
import { getAdminProductAttributesQuery } from "~/src/modules/product-attribute/product-attribute.server"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import { parseProductAttributeValueForType } from "~/src/modules/product-attribute/product-attribute.utils"

type AttributeOnProductRow = z.infer<(typeof attributeOnProductZodSchemas)["row"]>

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

interface VariantAttributeGroup {
  readonly rows: readonly AttributeOnProductRow[]
  readonly variantId: string
}

export const loadAttributeOnProductRows = async (
  productId: string,
  productLevelRows: readonly AttributeOnProductRow[],
  variantGroups: readonly VariantAttributeGroup[] = [],
): Promise<(typeof attributeOnProduct.$inferInsert)[]> => {
  const hasRows = productLevelRows.length > 0 || variantGroups.some((group) => group.rows.length > 0)
  const productAttributes = hasRows ? await getAdminProductAttributesQuery.execute() : []

  return [
    ...normalizeAttributeOnProductRows({ productAttributes, productId, rows: productLevelRows }),
    ...variantGroups.flatMap((group) =>
      normalizeAttributeOnProductRows({ productAttributes, productId, rows: group.rows, variantId: group.variantId }),
    ),
  ]
}

export const prepareAttributeOnProductBatch = (
  productId: string,
  rows: readonly (typeof attributeOnProduct.$inferInsert)[],
): DrizzleBatchStatement[] => [
  db.delete(attributeOnProduct).where(eq(attributeOnProduct.productId, productId)),
  ...insertRowChunks(attributeOnProduct, rows).map((chunk) => db.insert(attributeOnProduct).values(chunk)),
]
