import { eq } from "drizzle-orm"
import { v7 as uuidv7 } from "uuid"
import { type z } from "zod/v4"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { attributeOnProduct } from "~/src/modules/attribute-on-product/attribute-on-product.schema"
import { insertRows } from "~/src/modules/attribute-on-product/attribute-on-product.server"
import { type attributeOnProductZodSchemas } from "~/src/modules/attribute-on-product/attribute-on-product.zod"
import { getAdminProductAttributesQuery } from "~/src/modules/product-attribute/product-attribute.server"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import { parseProductAttributeValueForType } from "~/src/modules/product-attribute/product-attribute.utils"

type AttributeOnProductRow = z.infer<(typeof attributeOnProductZodSchemas)["row"]>

interface NormalizeAttributeOnProductRowsInput {
  readonly productAttributes: readonly ProductAttribute["select"][]
  readonly productId: string
  readonly rows: AttributeOnProductRow[]
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

export const replaceAttributesForProduct = async (productId: string, rows: readonly AttributeOnProductRow[]): Promise<void> => {
  const productAttributes =
    rows.length === 0
      ? []
      : await getAdminProductAttributesQuery
          .execute()
          .then((all) => all.filter((entry) => rows.some((row) => row.attributeId === entry.id)))
  const normalized = normalizeAttributeOnProductRows({
    productAttributes,
    productId,
    rows: [...rows],
  })
  await db.delete(attributeOnProduct).where(eq(attributeOnProduct.productId, productId))
  await insertRows(normalized)
}

interface VariantAttributeReplaceGroup {
  readonly rows: readonly AttributeOnProductRow[]
  readonly variantId: string
}

export const replaceAllAttributesForProduct = async (
  productId: string,
  productLevelRows: readonly AttributeOnProductRow[],
  variantGroups: readonly VariantAttributeReplaceGroup[],
): Promise<void> => {
  const variantRows = variantGroups.flatMap((group) => group.rows)
  const allRows = [...productLevelRows, ...variantRows]
  const productAttributes =
    allRows.length === 0
      ? []
      : await getAdminProductAttributesQuery
          .execute()
          .then((all) => all.filter((entry) => allRows.some((row) => row.attributeId === entry.id)))
  const normalized = [
    ...normalizeAttributeOnProductRows({
      productAttributes,
      productId,
      rows: [...productLevelRows],
    }),
    ...variantGroups.flatMap((group) =>
      normalizeAttributeOnProductRows({
        productAttributes,
        productId,
        rows: [...group.rows],
        variantId: group.variantId,
      }),
    ),
  ]
  await db.delete(attributeOnProduct).where(eq(attributeOnProduct.productId, productId))
  if (normalized.length > 0) {
    await insertRows(normalized)
  }
}
