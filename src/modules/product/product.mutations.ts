import { and, eq, ne, sql } from "drizzle-orm"

import {
  type DrizzleBatchStatement,
  type RankUpdate,
  chunkRankUpdates,
  insertRowChunks,
  runDrizzleBatch,
} from "~/src/integrations/drizzle-orm/drizzle.batch"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { inJsonList, notInJsonList } from "~/src/integrations/drizzle-orm/drizzle.utils"

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
  await db.delete(product).where(inJsonList(product.id, ids))
}

export const setProductRanks = async (updates: readonly RankUpdate[]): Promise<void> => {
  await runDrizzleBatch(
    chunkRankUpdates(product.id, updates).map(({ ids, rank }) => db.update(product).set({ rank }).where(inJsonList(product.id, ids))),
  )
}

export const findTakenSkus = async (skus: readonly string[], excludeProductId?: string): Promise<string[]> => {
  const normalizedSkus = [...new Set(skus.map((sku) => sku.trim()).filter((sku) => sku !== ""))]
  if (normalizedSkus.length === 0) {
    return []
  }

  const whereConditions = [inJsonList(productVariant.sku, normalizedSkus)]
  if (excludeProductId !== undefined) {
    whereConditions.push(ne(productVariant.productId, excludeProductId))
  }

  const rows = await db
    .select({
      sku: productVariant.sku,
    })
    .from(productVariant)
    .where(and(...whereConditions))
  return rows.map((row) => row.sku).filter((sku): sku is string => sku !== null && sku !== "")
}

export const prepareProductCatalogBatch = (productId: string, payload: ProductCatalogReplacePayload): DrizzleBatchStatement[] => {
  const { inventoryRows, optionOnVariantRows, optionRows, optionValueRows, variantRows } = payload
  const productVariants = eq(productVariant.productId, productId)
  const keptVariantIds = variantRows.map((row) => row.id)
  const droppedVariants = and(productVariants, notInJsonList(productVariant.id, keptVariantIds))

  return [
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
  ]
}

export const prepareProductOrganizationBatch = (productId: string, payload: ProductOrganizationReplacePayload): DrizzleBatchStatement[] => {
  const { categoryRows, collectionRows } = payload
  const primaryCategoryId = resolvePrimaryCategoryId(
    categoryRows.map((row) => ({
      categoryId: row.categoryId,
      isPrimary: row.isPrimary ?? false,
    })),
  )

  return [
    db.delete(categoryOnProduct).where(eq(categoryOnProduct.productId, productId)),
    db.delete(collectionOnProduct).where(eq(collectionOnProduct.productId, productId)),
    ...insertRowChunks(categoryOnProduct, categoryRows).map((rows) => db.insert(categoryOnProduct).values(rows)),
    ...insertRowChunks(collectionOnProduct, collectionRows).map((rows) => db.insert(collectionOnProduct).values(rows)),
    db
      .update(product)
      .set({
        primaryCategoryId: primaryCategoryId ?? sql`null`,
      })
      .where(eq(product.id, productId)),
  ]
}
