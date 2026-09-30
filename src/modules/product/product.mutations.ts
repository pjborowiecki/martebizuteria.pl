import { type SQL, and, eq, inArray, notInArray, sql } from "drizzle-orm"

import { type DrizzleBatchStatement, runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema"
import { resolvePrimaryCategoryId } from "~/src/modules/category-on-product/category-on-product.utils"
import { collectionOnProduct } from "~/src/modules/collection-on-product/collection-on-product.schema"
import { inventory } from "~/src/modules/inventory/inventory.schema"
import { optionOnVariant } from "~/src/modules/option-on-variant/option-on-variant.schema"
import { productOptionValue } from "~/src/modules/product-option-value/product-option-value.schema"
import { productOption } from "~/src/modules/product-option/product-option.schema"
import { productVariant } from "~/src/modules/product-variant/product-variant.schema"
import { product } from "~/src/modules/product/product.schema"
import { type ProductCatalogReplacePayload, type ProductOrganizationReplacePayload } from "~/src/modules/product/product.utils"

export const deleteProducts = async (ids: readonly string[]): Promise<void> => {
  if (ids.length === 0) {
    return
  }
  await db.delete(product).where(inArray(product.id, [...ids]))
}

export const setProductRanks = async (
  updates: readonly {
    id: string
    rank: number
  }[],
): Promise<void> => {
  if (updates.length === 0) {
    return
  }

  const ids = updates.map((entry) => entry.id)
  const cases = updates.map((entry) => sql`when ${product.id} = ${entry.id} then ${entry.rank}`)
  const rankExpression = sql`(case ${sql.join(cases, sql.raw(" "))} end)`
  await db
    .update(product)
    .set({
      rank: rankExpression,
    })
    .where(inArray(product.id, ids))
}

export const findTakenSkus = async (skus: readonly string[], excludeProductId?: string): Promise<string[]> => {
  const normalizedSkus = [...new Set(skus.map((sku) => sku.trim()).filter((sku) => sku !== ""))]
  if (normalizedSkus.length === 0) {
    return []
  }

  let excludeVariantIds: string[] = []
  if (excludeProductId !== undefined) {
    const variantIdRows = await db
      .select({
        id: productVariant.id,
      })
      .from(productVariant)
      .where(eq(productVariant.productId, excludeProductId))
    excludeVariantIds = variantIdRows.map((row) => row.id)
  }

  const whereConditions: SQL[] = [inArray(productVariant.sku, normalizedSkus)]
  if (excludeVariantIds.length > 0) {
    whereConditions.push(notInArray(productVariant.id, excludeVariantIds))
  }

  const rows = await db
    .select({
      sku: productVariant.sku,
    })
    .from(productVariant)
    .where(and(...whereConditions))
  return rows.map((row) => row.sku).filter((sku): sku is string => sku !== null && sku !== "")
}

export const replaceProductCatalog = async (productId: string, payload: ProductCatalogReplacePayload): Promise<void> => {
  const { inventoryRows, optionOnVariantRows, optionRows, optionValueRows, variantRows } = payload

  const statements: DrizzleBatchStatement[] = [
    db.delete(productOption).where(eq(productOption.productId, productId)),
    db.delete(productVariant).where(eq(productVariant.productId, productId)),
  ]

  if (optionRows.length > 0) {
    statements.push(db.insert(productOption).values(optionRows))
  }

  if (optionValueRows.length > 0) {
    statements.push(db.insert(productOptionValue).values(optionValueRows))
  }

  if (variantRows.length > 0) {
    statements.push(db.insert(productVariant).values(variantRows))
  }

  if (inventoryRows.length > 0) {
    statements.push(db.insert(inventory).values(inventoryRows))
  }

  if (optionOnVariantRows.length > 0) {
    statements.push(db.insert(optionOnVariant).values(optionOnVariantRows))
  }
  await runDrizzleBatch(statements)
}

export const replaceProductOrganization = async (productId: string, payload: ProductOrganizationReplacePayload): Promise<void> => {
  const { categoryRows, collectionRows } = payload
  const primaryCategoryId = resolvePrimaryCategoryId(
    categoryRows.map((row) => ({
      categoryId: row.categoryId,
      isPrimary: row.isPrimary ?? false,
    })),
  )

  const statements: DrizzleBatchStatement[] = [
    db.delete(categoryOnProduct).where(eq(categoryOnProduct.productId, productId)),
    db.delete(collectionOnProduct).where(eq(collectionOnProduct.productId, productId)),
  ]

  if (categoryRows.length > 0) {
    statements.push(db.insert(categoryOnProduct).values(categoryRows))
  }

  if (collectionRows.length > 0) {
    statements.push(db.insert(collectionOnProduct).values(collectionRows))
  }
  statements.push(
    db
      .update(product)
      .set({
        primaryCategoryId: primaryCategoryId ?? sql`null`,
      })
      .where(eq(product.id, productId)),
  )
  await runDrizzleBatch(statements)
}
