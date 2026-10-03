import { eq } from "drizzle-orm"
import type { z } from "zod/v4"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { normalizeProductAttributeLocaleMapForSave } from "~/src/modules/product-attribute/product-attribute.utils"
import { collectSkusFromCatalogInput } from "~/src/modules/product/product-sku.validation.utils"
import { getMaxRankQuery, getProductByHandleQuery } from "~/src/modules/product/product.accessors"
import { PRODUCT_ERROR_CODES } from "~/src/modules/product/product.constants"
import { deleteProducts, findTakenSkus, replaceProductCatalog, replaceProductOrganization } from "~/src/modules/product/product.mutations"
import { product } from "~/src/modules/product/product.schema"
import { type Product } from "~/src/modules/product/product.types"
import {
  normalizeOptionalProductLocaleMapForSave,
  normalizeProductTagsLocaleMapForSave,
  prepareCatalogReplacePayload,
  prepareOrganizationReplacePayload,
  toProductDbStatus,
} from "~/src/modules/product/product.utils"
import type { productZodSchemas } from "~/src/modules/product/product.zod"

const NO_RANK = -1

const toProductRow = (data: z.infer<(typeof productZodSchemas)["catalogUpsertInput"]>, id: string, rank: number): Product["insert"] => ({
  descriptions: normalizeOptionalProductLocaleMapForSave(data.descriptions),
  handle: data.handle,
  id,
  rank,
  status: toProductDbStatus(data.status),
  subtitles: normalizeOptionalProductLocaleMapForSave(data.subtitles),
  tags: normalizeProductTagsLocaleMapForSave(data.tags),
  titles: normalizeProductAttributeLocaleMapForSave(data.titles),
})

export const assertCatalogSkusAvailable = async (
  catalogInput: z.infer<(typeof productZodSchemas)["catalogUpsertInput"]>,
  productId?: string,
): Promise<void> => {
  const takenSkus = await findTakenSkus(collectSkusFromCatalogInput(catalogInput), productId)
  if (takenSkus.length > 0) {
    throw new Error(PRODUCT_ERROR_CODES.DUPLICATE_SKU)
  }
}

export const deleteOrphanProductByHandle = async (handle: string): Promise<boolean> => {
  const existing = await getProductByHandleQuery.execute({
    handle,
  })

  if (existing === undefined) {
    return false
  }

  if (existing.variants.length > 0) {
    return false
  }
  await deleteProducts([existing.id])

  return true
}

const persistProductCatalog = async (
  productId: string,
  data: z.infer<(typeof productZodSchemas)["catalogUpsertInput"]>,
  ownedVariantIds: ReadonlySet<string>,
): Promise<void> => {
  const organizationPayload = prepareOrganizationReplacePayload(productId, data)
  if (organizationPayload !== undefined) {
    await replaceProductOrganization(productId, organizationPayload)
  }
  await replaceProductCatalog(productId, prepareCatalogReplacePayload(productId, data, ownedVariantIds))
}

export const insertProductWithCatalog = async (
  data: z.infer<(typeof productZodSchemas)["catalogUpsertInput"]>,
  id: string,
): Promise<void> => {
  const [maxRank] = await getMaxRankQuery.execute()
  let nextRank = maxRank?.value ?? NO_RANK
  nextRank++
  await db.insert(product).values(toProductRow(data, id, nextRank))
  await assertCatalogSkusAvailable(data, id)
  await persistProductCatalog(id, data, new Set())
}

export const updateProductWithCatalog = async (
  id: string,
  catalogInput: z.infer<(typeof productZodSchemas)["catalogUpsertInput"]>,
  ownedVariantIds: ReadonlySet<string>,
): Promise<void> => {
  await db
    .update(product)
    .set({
      descriptions: normalizeOptionalProductLocaleMapForSave(catalogInput.descriptions),
      handle: catalogInput.handle,
      status: toProductDbStatus(catalogInput.status),
      subtitles: normalizeOptionalProductLocaleMapForSave(catalogInput.subtitles),
      tags: normalizeProductTagsLocaleMapForSave(catalogInput.tags),
      titles: normalizeProductAttributeLocaleMapForSave(catalogInput.titles),
    })
    .where(eq(product.id, id))
  await persistProductCatalog(id, catalogInput, ownedVariantIds)
}
