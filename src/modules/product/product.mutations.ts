import { type SQL, and, eq, inArray, notInArray, sql } from "drizzle-orm"

import { type DrizzleBatchStatement, insertRowChunks, runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { notInJsonList } from "~/src/integrations/drizzle-orm/drizzle.utils"

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
  const productVariants = eq(productVariant.productId, productId)
  const keptVariantIds = variantRows.map((row) => row.id)
  const droppedVariants = and(productVariants, notInJsonList(productVariant.id, keptVariantIds))

  await runDrizzleBatch([
    db.delete(productOption).where(eq(productOption.productId, productId)),
    db.delete(productVariant).where(droppedVariants),
    db
      .update(productVariant)
      .set({ sku: sql`NULL` })
      .where(productVariants),
    ...insertRowChunks(productOption, optionRows).map((rows) => db.insert(productOption).values(rows)),
    ...insertRowChunks(productOptionValue, optionValueRows).map((rows) => db.insert(productOptionValue).values(rows)),
    ...insertRowChunks(productVariant, variantRows).map((rows) =>
      db
        .insert(productVariant)
        .values(rows)
        .onConflictDoUpdate({
          set: {
            compareAtPrice: sql`excluded.compare_at_price`,
            manageInventory: sql`excluded.manage_inventory`,
            price: sql`excluded.price`,
            sku: sql`excluded.sku`,
            title: sql`excluded.title`,
            updatedAt: sql`excluded.updated_at`,
          },
          target: productVariant.id,
        }),
    ),
    ...insertRowChunks(inventory, inventoryRows).map((rows) =>
      db
        .insert(inventory)
        .values(rows)
        .onConflictDoUpdate({
          set: { quantityAvailable: sql`excluded.quantity_available`, version: sql`${inventory.version} + 1` },
          setWhere: sql`${inventory.quantityAvailable} <> excluded.quantity_available`,
          target: inventory.variantId,
        }),
    ),
    ...insertRowChunks(optionOnVariant, optionOnVariantRows).map((rows) => db.insert(optionOnVariant).values(rows)),
  ])
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
