import { count, eq, isNull, sql } from "drizzle-orm"

import { type DrizzleBatchStatement, insertRowChunks } from "~/src/integrations/drizzle-orm/drizzle.batch"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { inJsonList } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { attributeOnProduct } from "~/src/modules/attribute-on-product/attribute-on-product.schema"
import { type AttributeOnProductRow, type FulfillmentTimeAttribute } from "~/src/modules/attribute-on-product/attribute-on-product.types"
import { normalizeAttributeOnProductRows } from "~/src/modules/attribute-on-product/attribute-on-product.utils"
import { getAdminProductAttributesQuery } from "~/src/modules/product-attribute/product-attribute.accessors"
import { FULFILLMENT_TIME_ATTRIBUTE_HANDLE } from "~/src/modules/product-attribute/product-attribute.constants"
import { productVariant } from "~/src/modules/product-variant/product-variant.schema"

export const getByProductIdQuery = db.query.attributeOnProduct
  .findMany({
    orderBy: (values, { asc: ascOrder }) => [ascOrder(values.rank)],
    where: eq(attributeOnProduct.productId, sql.placeholder("productId")),
    with: {
      productAttribute: true,
    },
  })
  .prepare()

export const getProductCountsByAttributeId = async (): Promise<Map<string, number>> => {
  const rows = await db
    .select({
      attributeId: attributeOnProduct.attributeId,
      productCount: count(),
    })
    .from(attributeOnProduct)
    .groupBy(attributeOnProduct.attributeId)
  return new Map(rows.map((row) => [row.attributeId, row.productCount]))
}

export const countForAttributeIds = async (ids: readonly string[]): Promise<number> => {
  if (ids.length === 0) {
    return 0
  }

  const [row] = await db
    .select({
      value: count(),
    })
    .from(attributeOnProduct)
    .where(inJsonList(attributeOnProduct.attributeId, ids))
  return row?.value ?? 0
}

const ATTRIBUTE_VALUE_WITH_DEFINITION = {
  columns: { value: true },
  with: { productAttribute: { columns: { allowedValues: true, handle: true, type: true, unit: true } } },
} as const

export const getFulfillmentTimeAttributesByVariantId = async (
  variantIds: readonly string[],
): Promise<ReadonlyMap<string, FulfillmentTimeAttribute>> => {
  const variants = await db.query.productVariant.findMany({
    columns: { id: true },
    where: inJsonList(productVariant.id, variantIds),
    with: {
      attributes: ATTRIBUTE_VALUE_WITH_DEFINITION,
      product: {
        columns: { id: true },
        with: { attributes: { ...ATTRIBUTE_VALUE_WITH_DEFINITION, where: isNull(attributeOnProduct.variantId) } },
      },
    },
  })

  return new Map(
    variants.flatMap((variant) => {
      const productPageAttributes = variant.attributes.length > 0 ? variant.attributes : variant.product.attributes
      const fulfillmentTime = productPageAttributes.find(
        (entry) => entry.productAttribute.handle === FULFILLMENT_TIME_ATTRIBUTE_HANDLE && entry.value.trim() !== "",
      )
      if (fulfillmentTime === undefined) {
        return []
      }

      const { allowedValues, type, unit } = fulfillmentTime.productAttribute

      return [[variant.id, { allowedValues, type, unit, value: fulfillmentTime.value }] as const]
    }),
  )
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
