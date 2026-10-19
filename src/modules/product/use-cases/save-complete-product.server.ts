import { eq } from "drizzle-orm"
import { v7 as uuidv7 } from "uuid"
import type { z } from "zod/v4"

import { type DrizzleBatchStatement } from "~/src/integrations/drizzle-orm/drizzle.batch"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { parseMoneyInputToMinorUnits } from "~/src/modules/_core/utils/currency"
import { buildCategoryOnProductRows } from "~/src/modules/category-on-product/category-on-product.utils"
import { buildCollectionOnProductRows } from "~/src/modules/collection-on-product/collection-on-product.utils"
import { normalizeProductAttributeLocaleMapForSave } from "~/src/modules/product-attribute/product-attribute.utils"
import {
  DEFAULT_VARIANT_TITLE,
  type ProductOptionDraft,
  buildVariantCombinationKey,
  buildVariantCombinations,
  buildVariantDisplayTitle,
  normalizeOptionDrafts,
} from "~/src/modules/product-variant/product-variant.utils"
import {
  deleteProducts,
  findTakenSkus,
  getMaxRankQuery,
  getProductByHandleQuery,
  prepareProductCatalogBatch,
  prepareProductOrganizationBatch,
} from "~/src/modules/product/product.accessors"
import { PRODUCT_ERROR_CODES } from "~/src/modules/product/product.constants"
import { product } from "~/src/modules/product/product.schema"
import {
  type Product,
  type ProductCatalogReplacePayload,
  type ProductOrganizationReplacePayload,
  type ProductVariantPersistRow,
} from "~/src/modules/product/product.types"
import {
  collectSkusFromCatalogInput,
  normalizeOptionalProductLocaleMapForSave,
  normalizeProductTagsLocaleMapForSave,
  toProductDbStatus,
} from "~/src/modules/product/product.utils"
import type { productZodSchemas } from "~/src/modules/product/product.zod"

const EMPTY_SKU = ""

const MANAGE_INVENTORY_ALWAYS = true

type CatalogUpsertInput = z.infer<(typeof productZodSchemas)["catalogUpsertInput"]>

type VariantRowInput = CatalogUpsertInput["variants"][number]

type SimpleVariantInput = NonNullable<CatalogUpsertInput["simpleVariant"]>

type ProductOptionWithId = ProductOptionDraft & { readonly id: string }

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
    throw new AppError(ERROR_CODES.CONFLICT, PRODUCT_ERROR_CODES.DUPLICATE_SKU)
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

const prepareProductDetailsBatch = (
  productId: string,
  data: z.infer<(typeof productZodSchemas)["catalogUpsertInput"]>,
  catalogPayload: ProductCatalogReplacePayload,
): DrizzleBatchStatement[] => {
  const organizationPayload = prepareOrganizationReplacePayload(productId, data)

  return [
    ...(organizationPayload === undefined ? [] : prepareProductOrganizationBatch(productId, organizationPayload)),
    ...prepareProductCatalogBatch(productId, catalogPayload),
  ]
}

export const getNextProductRank = async (): Promise<number> => {
  const [maxRank] = await getMaxRankQuery.execute()

  return (maxRank?.value ?? NO_RANK) + 1
}

export const prepareProductInsertBatch = (
  id: string,
  data: z.infer<(typeof productZodSchemas)["catalogUpsertInput"]>,
  rank: number,
): DrizzleBatchStatement[] => [
  db.insert(product).values(toProductRow(data, id, rank)),
  ...prepareProductDetailsBatch(id, data, prepareCatalogReplacePayload(id, data, new Set())),
]

export const prepareProductUpdateBatch = (
  id: string,
  catalogInput: z.infer<(typeof productZodSchemas)["catalogUpsertInput"]>,
  catalogPayload: ProductCatalogReplacePayload,
): DrizzleBatchStatement[] => [
  db
    .update(product)
    .set({
      descriptions: normalizeOptionalProductLocaleMapForSave(catalogInput.descriptions),
      handle: catalogInput.handle,
      status: toProductDbStatus(catalogInput.status),
      subtitles: normalizeOptionalProductLocaleMapForSave(catalogInput.subtitles),
      tags: normalizeProductTagsLocaleMapForSave(catalogInput.tags),
      titles: normalizeProductAttributeLocaleMapForSave(catalogInput.titles),
    })
    .where(eq(product.id, id)),
  ...prepareProductDetailsBatch(id, catalogInput, catalogPayload),
]

const normalizeSku = (sku: string | undefined): string | undefined => {
  const trimmed = sku?.trim()
  if (trimmed === undefined || trimmed === EMPTY_SKU) {
    return undefined
  }

  return trimmed
}

const requireMoneyMinorUnits = (input: string): number => {
  const minor = parseMoneyInputToMinorUnits(input, STORE_CURRENCY_CODE)
  if (minor === undefined) {
    throw new Error("Invalid money input")
  }

  return minor
}

const ownedVariantId = (id: string | undefined, ownedVariantIds: ReadonlySet<string>): string =>
  id !== undefined && ownedVariantIds.has(id) ? id : uuidv7()

const buildSimpleVariantRows = (simple: SimpleVariantInput, ownedVariantIds: ReadonlySet<string>): ProductVariantPersistRow[] => [
  {
    compareAtPrice: simple.compareAtPrice === "" ? undefined : requireMoneyMinorUnits(simple.compareAtPrice),
    id: ownedVariantId(simple.id, ownedVariantIds),
    loadedQuantity: simple.loadedQuantity,
    manageInventory: MANAGE_INVENTORY_ALWAYS,
    optionValues: {},
    price: requireMoneyMinorUnits(simple.price),
    quantity: simple.quantity,
    sku: normalizeSku(simple.sku),
    title: DEFAULT_VARIANT_TITLE,
  },
]

const mergeVariantRows = ({
  combinations,
  options,
  ownedVariantIds,
  variants,
}: Readonly<{
  combinations: ReturnType<typeof buildVariantCombinations>
  options: readonly ProductOptionDraft[]
  ownedVariantIds: ReadonlySet<string>
  variants: readonly VariantRowInput[]
}>): ProductVariantPersistRow[] => {
  const variantsByKey = new Map(variants.map((row) => [buildVariantCombinationKey(row.optionValues), row] as const))
  const variantsByTitle = new Map(variants.map((row) => [(row.title ?? "").trim(), row] as const))

  return combinations.map((combination, combinationIndex) => {
    const key = buildVariantCombinationKey(combination.optionValues)
    const existing =
      variantsByKey.get(key) ??
      variantsByTitle.get(buildVariantDisplayTitle(combination.optionValues, options, I18N.DEFAULT_LOCALE)) ??
      variantsByTitle.get(combination.title) ??
      variants[combinationIndex]
    return {
      compareAtPrice:
        existing?.compareAtPrice === undefined || existing.compareAtPrice === ""
          ? undefined
          : requireMoneyMinorUnits(existing.compareAtPrice),
      id: ownedVariantId(existing?.id, ownedVariantIds),
      loadedQuantity: existing?.loadedQuantity,
      manageInventory: MANAGE_INVENTORY_ALWAYS,
      optionValues: combination.optionValues,
      price: requireMoneyMinorUnits(existing?.price ?? ""),
      quantity: existing?.quantity ?? 0,
      sku: normalizeSku(existing?.sku),
      title: existing?.title?.trim() === "" ? combination.title : (existing?.title ?? combination.title),
    }
  })
}

const buildMultiVariantRows = (
  options: readonly ProductOptionDraft[],
  variants: readonly VariantRowInput[],
  ownedVariantIds: ReadonlySet<string>,
): ProductVariantPersistRow[] => {
  const normalizedOptions = normalizeOptionDrafts(options)
  const combinations = buildVariantCombinations(normalizedOptions)

  return mergeVariantRows({ combinations, options, ownedVariantIds, variants })
}

const buildVariantPersistRows = (input: CatalogUpsertInput, ownedVariantIds: ReadonlySet<string>): ProductVariantPersistRow[] => {
  if (input.hasVariants) {
    return buildMultiVariantRows(input.options, input.variants, ownedVariantIds)
  }

  return buildSimpleVariantRows(
    input.simpleVariant ?? {
      compareAtPrice: "",
      manageInventory: true,
      price: "",
      quantity: 0,
      sku: "",
    },
    ownedVariantIds,
  )
}

const buildOptionValueRows = (
  options: readonly ProductOptionWithId[],
): Pick<ProductCatalogReplacePayload, "optionValueRows"> & { readonly valueIdByOptionAndKey: Map<string, string> } => {
  const optionValueRows: ProductCatalogReplacePayload["optionValueRows"] = []
  const valueIdByOptionAndKey = new Map<string, string>()
  for (const option of options) {
    for (const [rank, value] of option.values.entries()) {
      const id = value.id ?? uuidv7()
      optionValueRows.push({ id, labels: normalizeProductAttributeLocaleMapForSave(value.labels), optionId: option.id, rank })
      const labelKey = I18N.SUPPORTED_LOCALES.map((locale) => value.labels[locale].trim()).join("|")
      valueIdByOptionAndKey.set(`${option.id}|${labelKey}`, id)
      if (value.id !== undefined) {
        valueIdByOptionAndKey.set(`${option.id}|${value.id}`, id)
      }
    }
  }

  return { optionValueRows, valueIdByOptionAndKey }
}

export const prepareCatalogReplacePayload = (
  productId: string,
  input: CatalogUpsertInput,
  ownedVariantIds: ReadonlySet<string>,
): ProductCatalogReplacePayload => {
  const variantPersistRows = buildVariantPersistRows(input, ownedVariantIds)
  const options = (input.hasVariants ? normalizeOptionDrafts(input.options) : []).map((option) => ({
    id: option.id ?? uuidv7(),
    titles: option.titles,
    values: option.values,
  }))
  const optionRows = options.map((option) => ({
    id: option.id,
    productId,
    titles: normalizeProductAttributeLocaleMapForSave(option.titles),
  }))
  const { optionValueRows, valueIdByOptionAndKey } = buildOptionValueRows(options)
  const variantRows = variantPersistRows.map((variantRow) => ({
    compareAtPrice: variantRow.compareAtPrice,
    id: variantRow.id,
    manageInventory: variantRow.manageInventory,
    price: variantRow.price,
    productId,
    sku: variantRow.sku,
    title: variantRow.title,
  }))

  const inventoryRows = variantPersistRows.map((variantRow) => ({
    id: uuidv7(),
    quantityAvailable: variantRow.quantity,
    quantityReserved: 0,
    variantId: variantRow.id,
  }))
  const inventoryAdjustments = variantPersistRows.flatMap(({ id, loadedQuantity, quantity }) =>
    ownedVariantIds.has(id) && loadedQuantity !== undefined && quantity !== loadedQuantity
      ? [{ quantityChange: quantity - loadedQuantity, variantId: id }]
      : [],
  )

  const optionOnVariantRows = variantPersistRows.flatMap((variantRow) =>
    Object.entries(variantRow.optionValues).flatMap(([optionId, valueKey]) => {
      const valueId = valueIdByOptionAndKey.get(`${optionId}|${valueKey}`)
      if (valueId === undefined) {
        return []
      }

      return [
        {
          id: uuidv7(),
          optionId,
          valueId,
          variantId: variantRow.id,
        },
      ]
    }),
  )

  return {
    inventoryAdjustments,
    inventoryRows,
    optionOnVariantRows,
    optionRows,
    optionValueRows,
    variantRows,
  }
}

export const prepareOrganizationReplacePayload = (
  productId: string,
  input: CatalogUpsertInput,
): ProductOrganizationReplacePayload | undefined => {
  if (input.primaryCategoryId === "") {
    return undefined
  }

  return {
    categoryRows: buildCategoryOnProductRows(productId, input.primaryCategoryId, input.additionalCategoryIds),
    collectionRows: buildCollectionOnProductRows(productId, input.collectionIds),
  }
}
