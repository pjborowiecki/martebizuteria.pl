import { type ColumnFiltersState, type SortingState } from "@tanstack/react-table"

import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { isSupportedLocale } from "~/src/integrations/use-intl/i18n.paths"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { isDateColumnFilterValue, isNumericColumnFilterValue } from "~/src/modules/_core/utils/column-filters"
import { type AuditChangeMetadata, buildAuditChangeMetadata, toAuditMetadataRecord } from "~/src/modules/audit-log/audit-log.diff.utils"
import { resolvePrimaryCategoryId } from "~/src/modules/category-on-product/category-on-product.utils"
import { INVENTORY_NON_NEGATIVE_AVAILABLE_CHECK } from "~/src/modules/inventory/inventory.constants"
import { type ProductAttributeType } from "~/src/modules/product-attribute/product-attribute.constants"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import {
  coerceProductAttributeLocaleMap,
  normalizeProductAttributeLocaleMapForSave,
  resolveLocalizedString,
  resolveProductAttributeTitle,
} from "~/src/modules/product-attribute/product-attribute.utils"
import { resolveCategoryTitle } from "~/src/modules/product-category/product-category.utils"
import { resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils"
import { galleryImagesToReplacePayload, isProductLevelImage } from "~/src/modules/product-image/product-image.utils"
import { inferHasVariants, resolveVariantOptionValueIds } from "~/src/modules/product-variant/product-variant.utils"
import type {
  getProductByHandleQuery,
  getProductVariantSkuRowsQuery,
  getProductVariantStatsQuery,
  getPublishedProductByHandleQuery,
} from "~/src/modules/product/product.accessors"
import {
  PRODUCT_ADMIN_STATUS,
  PRODUCT_ERROR_CODES,
  PRODUCT_INVENTORY_LEVEL,
  PRODUCT_LOW_STOCK_THRESHOLD,
  PRODUCT_MULTI_VARIANT_COUNT_THRESHOLD,
  PRODUCT_STATUS,
  PRODUCT_TABLE_COLUMN_ID,
  PRODUCT_VARIANT_KIND,
  type ProductAdminStatus,
  type ProductInventoryLevel,
  type ProductStatus,
  type ProductVariantKind,
} from "~/src/modules/product/product.constants"
import {
  type AdminProductsListColumnFilters,
  type AdminProductsListSort,
  type Product,
  type ProductAuditSnapshot,
  type ProductAuditVariantSnapshot,
  type ProductFormSkuEntry,
  type ProductSkuFormFieldPath,
} from "~/src/modules/product/product.types"
import { type CatalogUpsertInput, type ProductFormValues } from "~/src/modules/product/product.zod"
import { type getAdminProductsCatalogList } from "~/src/modules/product/use-cases/list-admin-products.server"

const EMPTY_SKU = ""

const VARIANT_SKU_PATH_REGEX = /^variants\.(?<variantIndex>\d+)\.sku$/u

const UNIQUE_PRODUCT_HANDLE_CONSTRAINT = "UNIQUE constraint failed: product.handle"

const UNIQUE_PRODUCT_VARIANT_SKU_CONSTRAINT = "UNIQUE constraint failed: product_variant.sku"

const NEGATIVE_AVAILABLE_STOCK_CONSTRAINT = `CHECK constraint failed: ${INVENTORY_NON_NEGATIVE_AVAILABLE_CHECK}`

const SERVER_SORTABLE_COLUMN_IDS = new Set<string>([
  PRODUCT_TABLE_COLUMN_ID.title,
  PRODUCT_TABLE_COLUMN_ID.recordId,
  PRODUCT_TABLE_COLUMN_ID.status,
  PRODUCT_TABLE_COLUMN_ID.minPrice,
  PRODUCT_TABLE_COLUMN_ID.stock,
  PRODUCT_TABLE_COLUMN_ID.variantKind,
  PRODUCT_TABLE_COLUMN_ID.createdAt,
  PRODUCT_TABLE_COLUMN_ID.editedAt,
])

export type AdminProductListRow = Awaited<ReturnType<typeof getAdminProductsCatalogList>>[number]

type ProductByHandleRow = NonNullable<Awaited<ReturnType<(typeof getProductByHandleQuery)["execute"]>>>

type ProductByHandleVariantRow = ProductByHandleRow["variants"][number]

export type AdminProductDetail = Omit<ProductByHandleRow, "variants"> & {
  readonly variants: (Omit<ProductByHandleVariantRow, "inventory"> & {
    readonly inventory: ProductByHandleVariantRow["inventory"] | null
  })[]
}

export type PublishedProductByHandleRow = NonNullable<Awaited<ReturnType<(typeof getPublishedProductByHandleQuery)["execute"]>>>

export type ProductVariantStatsRow = Awaited<ReturnType<(typeof getProductVariantStatsQuery)["execute"]>>[number]

export const coerceProductLocaleMap = (value: unknown): Product["localeMap"] => coerceProductAttributeLocaleMap(value)

export const normalizeOptionalProductLocaleMapForSave = (map: Product["localeMap"]): Product["localeMap"] | undefined => {
  const normalized = normalizeProductAttributeLocaleMapForSave(map)
  if (I18N.SUPPORTED_LOCALES.every((locale) => normalized[locale] === "")) {
    return undefined
  }

  return normalized
}

export const resolveProductTitle = (titles: unknown, locale: string): string =>
  resolveLocalizedString(coerceProductLocaleMap(titles), locale)

export const resolveProductSubtitle = (subtitles: unknown, locale: string): string =>
  resolveLocalizedString(coerceProductLocaleMap(subtitles), locale)

export const resolveProductDescription = (descriptions: unknown, locale: string): string =>
  resolveLocalizedString(coerceProductLocaleMap(descriptions), locale)

export const createEmptyProductTagsLocaleMap = (): Product["tagsLocaleMap"] =>
  Object.fromEntries(I18N.SUPPORTED_LOCALES.map((locale) => [locale, [] as string[]]))

export const coerceProductTagsLocaleMap = (value: unknown): Product["tagsLocaleMap"] => {
  if (Array.isArray(value)) {
    return {
      ...createEmptyProductTagsLocaleMap(),
      [I18N.DEFAULT_LOCALE]: value.filter((entry): entry is string => typeof entry === "string"),
    }
  }

  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) {
    return createEmptyProductTagsLocaleMap()
  }

  const record = value as Partial<Record<string, unknown>>

  return Object.fromEntries(
    I18N.SUPPORTED_LOCALES.map((locale) => {
      const tags = record[locale]
      if (!Array.isArray(tags)) {
        return [locale, [] as string[]]
      }

      return [locale, tags.filter((entry): entry is string => typeof entry === "string")]
    }),
  )
}

export const normalizeProductTagsLocaleMapForSave = (map: Product["tagsLocaleMap"]): Product["tagsLocaleMap"] | undefined => {
  const normalized = Object.fromEntries(
    I18N.SUPPORTED_LOCALES.map((locale) => [locale, map[locale].map((tag) => tag.trim()).filter((tag) => tag !== "")]),
  )

  if (I18N.SUPPORTED_LOCALES.every((locale) => normalized[locale].length === 0)) {
    return undefined
  }

  return normalized
}

export const resolveProductTags = (tags: unknown, locale: string): string[] => {
  const map = coerceProductTagsLocaleMap(tags)
  if (isSupportedLocale(locale)) {
    return map[locale]
  }

  return map[I18N.DEFAULT_LOCALE]
}

export type ProductVariantSkuRow = Awaited<ReturnType<(typeof getProductVariantSkuRowsQuery)["execute"]>>[number]

export const buildVariantStatsByProductId = (stats: readonly ProductVariantStatsRow[]) =>
  new Map(
    stats.map((entry) => [
      entry.productId,
      {
        minPrice: entry.minPrice ?? undefined,
        totalStock: entry.totalStock,
        variantCount: entry.variantCount,
      },
    ]),
  )

export const buildSkuSummaryByProductId = (rows: readonly ProductVariantSkuRow[]): Map<string, string> => {
  const skusByProductId = new Map<string, string[]>()
  for (const row of rows) {
    const sku = row.sku?.trim() ?? ""
    if (sku !== "") {
      const existing = skusByProductId.get(row.productId) ?? []
      if (!existing.includes(sku)) {
        existing.push(sku)
      }
      skusByProductId.set(row.productId, existing)
    }
  }

  return new Map([...skusByProductId.entries()].map(([productId, skus]) => [productId, skus.join(", ")]))
}

export const resolveProductVariantKind = (variantCount: number): ProductVariantKind =>
  variantCount > PRODUCT_MULTI_VARIANT_COUNT_THRESHOLD ? PRODUCT_VARIANT_KIND.MULTI : PRODUCT_VARIANT_KIND.SINGLE

const formatUniqueProductAttributeTitles = (
  attributeRows: readonly {
    readonly attributeId: string
    readonly productAttribute: {
      readonly titles: ProductAttribute["localeMap"]
    }
  }[],
): string => {
  const seenAttributeIds = new Set<string>()

  return attributeRows
    .filter((entry) => {
      if (seenAttributeIds.has(entry.attributeId)) {
        return false
      }
      seenAttributeIds.add(entry.attributeId)

      return true
    })
    .map((entry) => resolveProductAttributeTitle(entry.productAttribute.titles, I18N.DEFAULT_LOCALE))
    .filter((title) => title !== "")
    .join(", ")
}

export const toAdminProductListItem = (
  row: AdminProductListRow,
  statsByProductId: Map<
    string,
    {
      minPrice: number | undefined
      totalStock: number
      variantCount: number
    }
  >,
  skuSummaryByProductId?: ReadonlyMap<string, string>,
): Product["adminListItem"] => {
  const { attributes: attributeRows, categories: categoryRows, collections: collectionRows, ...productRow } = row
  const stats = statsByProductId.get(row.id)
  const variantCount = stats?.variantCount ?? 0
  const totalStock = stats?.totalStock ?? 0
  const minPrice = stats?.minPrice ?? undefined
  const primaryCategoryRow =
    categoryRows.find((entry) => entry.isPrimary) ??
    categoryRows.find((entry) => entry.categoryId === productRow.primaryCategoryId) ??
    categoryRows[0]
  return {
    ...productRow,
    attributeTitles: formatUniqueProductAttributeTitles(attributeRows),
    categoryTitle:
      primaryCategoryRow === undefined
        ? undefined
        : resolveCategoryTitle(primaryCategoryRow.productCategory.titles, I18N.DEFAULT_LOCALE) || undefined,
    categoryTitles: categoryRows
      .map((entry) => resolveCategoryTitle(entry.productCategory.titles, I18N.DEFAULT_LOCALE))
      .filter((title) => title !== "")
      .join(", "),
    collectionTitles: collectionRows
      .map((entry) => resolveCollectionTitle(entry.productCollection.titles, I18N.DEFAULT_LOCALE))
      .filter((title) => title !== "")
      .join(", "),
    descriptions: coerceProductLocaleMap(productRow.descriptions),
    inventoryLevel: resolveProductInventoryLevel(row.status, totalStock),
    minPrice,
    skuSummary: skuSummaryByProductId?.get(row.id),
    subtitles: coerceProductLocaleMap(productRow.subtitles),
    tags: coerceProductTagsLocaleMap(productRow.tags),
    titles: coerceProductLocaleMap(productRow.titles),
    totalStock,
    variantCount,
  }
}

export const toProductDbStatus = (status: ProductAdminStatus): ProductStatus => {
  if (status === PRODUCT_ADMIN_STATUS.ACTIVE) {
    return PRODUCT_STATUS.PUBLISHED
  }

  if (status === PRODUCT_ADMIN_STATUS.ARCHIVED) {
    return PRODUCT_STATUS.ARCHIVED
  }

  return PRODUCT_STATUS.DRAFT
}

export const toProductAdminStatus = (status: ProductStatus): ProductAdminStatus => {
  if (status === PRODUCT_STATUS.PUBLISHED) {
    return PRODUCT_ADMIN_STATUS.ACTIVE
  }

  if (status === PRODUCT_STATUS.ARCHIVED) {
    return PRODUCT_ADMIN_STATUS.ARCHIVED
  }

  return PRODUCT_ADMIN_STATUS.DRAFT
}

export const resolveProductInventoryLevel = (status: ProductStatus, totalStock: number): ProductInventoryLevel => {
  if (status !== PRODUCT_STATUS.PUBLISHED) {
    return PRODUCT_INVENTORY_LEVEL.OK
  }

  if (totalStock <= 0) {
    return PRODUCT_INVENTORY_LEVEL.OUT
  }

  if (totalStock <= PRODUCT_LOW_STOCK_THRESHOLD) {
    return PRODUCT_INVENTORY_LEVEL.LOW
  }

  return PRODUCT_INVENTORY_LEVEL.OK
}

const mapAttributeRowsToSpecifications = (
  attributes: readonly {
    readonly productAttribute: {
      readonly allowedValues: readonly ProductAttribute["allowedValue"][] | null
      readonly handle: string
      readonly titles: ProductAttribute["localeMap"]
      readonly type: ProductAttributeType
      readonly unit: string | null
    }
    readonly rank: number
    readonly value: string
  }[],
): Product["specification"][] =>
  attributes.map((entry) => ({
    allowedValues: entry.productAttribute.allowedValues,
    handle: entry.productAttribute.handle,
    rank: entry.rank,
    titles: entry.productAttribute.titles,
    type: entry.productAttribute.type,
    unit: entry.productAttribute.unit,
    value: entry.value,
  }))

export const mapPublishedProductForStorefront = (
  productRow: PublishedProductByHandleRow,
  locale: string = I18N.DEFAULT_LOCALE,
): Product["storefront"] => {
  const { attributes, categories: categoryRows, collections: collectionRows, images: imageRows, options } = productRow
  const resolvedPrimaryCategoryId = productRow.primaryCategoryId ?? resolvePrimaryCategoryId(categoryRows)
  const primaryCategory = categoryRows.find((entry) => entry.categoryId === resolvedPrimaryCategoryId)?.productCategory
  const [firstCollection] = collectionRows
  const resolvedDescription = resolveProductDescription(productRow.descriptions, locale)
  const resolvedSubtitle = resolveProductSubtitle(productRow.subtitles, locale)
  const resolvedTags = resolveProductTags(productRow.tags, locale)
  const sharedImageUrls = imageRows.filter((image) => isProductLevelImage(image.variantId)).map((image) => image.url)
  const productLevelAttributes = attributes.filter((entry) => entry.variantId === null)
  const sharedSpecifications = mapAttributeRowsToSpecifications(productLevelAttributes)
  const storefrontOptions: Product["storefrontOption"][] = options.map((option) => ({
    id: option.id,
    title: resolveProductTitle(option.titles, locale),
    values: option.values.map((value) => ({
      id: value.id,
      label: resolveProductTitle(value.labels, locale),
    })),
  }))

  const hasVariants = inferHasVariants(options, productRow.variants.length)
  const variants = productRow.variants.map((variant) => {
    const variantImages = variant.images
    const variantImageUrls = variantImages.map((image) => image.url)
    const fallbackImages = variantImageUrls.length > 0 ? variantImageUrls : sharedImageUrls
    const variantAttributes = variant.attributes
    const variantSpecifications = mapAttributeRowsToSpecifications(variantAttributes)
    const specifications = variantSpecifications.length > 0 ? variantSpecifications : sharedSpecifications

    return {
      ...variant,
      imageUrls: fallbackImages,
      optionValueIds: resolveVariantOptionValueIds(variant),
      specifications,
    }
  })

  const firstVariantImages = variants[0]?.imageUrls ?? []
  let primaryImageUrls = imageRows.map((image) => image.url)
  if (firstVariantImages.length > 0) {
    primaryImageUrls = [...firstVariantImages]
  } else if (sharedImageUrls.length > 0) {
    primaryImageUrls = [...sharedImageUrls]
  }

  return {
    categories: categoryRows.map((entry) => entry.productCategory),
    category: primaryCategory,
    categoryId: resolvedPrimaryCategoryId ?? undefined,
    collection: firstCollection?.productCollection,
    collectionId: firstCollection?.collectionId,
    collections: collectionRows.map((entry) => entry.productCollection),
    createdAt: productRow.createdAt,
    description: resolvedDescription,
    handle: productRow.handle,
    hasVariants,
    id: productRow.id,
    imageUrls: primaryImageUrls,
    metadata: productRow.metadata,
    options: storefrontOptions,
    primaryCategoryId: resolvedPrimaryCategoryId ?? productRow.primaryCategoryId,
    rank: productRow.rank,
    sharedImageUrls,
    sharedSpecifications,
    specifications: sharedSpecifications,
    status: productRow.status,
    subtitle: resolvedSubtitle,
    tags: resolvedTags.length > 0 ? resolvedTags : undefined,
    thumbnail: productRow.thumbnail,
    title: resolveProductTitle(productRow.titles, locale),
    updatedAt: productRow.updatedAt,
    variants,
  }
}

type AdminProductsColumnFilterHandler = (filters: AdminProductsListColumnFilters, value: unknown) => AdminProductsListColumnFilters

const applyMinPriceFilter: AdminProductsColumnFilterHandler = (filters, value) =>
  isNumericColumnFilterValue(value)
    ? {
        ...filters,
        minPrice: value,
      }
    : filters

const applyTotalStockFilter: AdminProductsColumnFilterHandler = (filters, value) =>
  isNumericColumnFilterValue(value)
    ? {
        ...filters,
        totalStock: value,
      }
    : filters

const applyCreatedAtFilter: AdminProductsColumnFilterHandler = (filters, value) =>
  isDateColumnFilterValue(value)
    ? {
        ...filters,
        createdAt: value,
      }
    : filters

const ADMIN_PRODUCTS_COLUMN_FILTER_HANDLERS: Partial<Record<string, AdminProductsColumnFilterHandler>> = {
  [PRODUCT_TABLE_COLUMN_ID.createdAt]: applyCreatedAtFilter,
  [PRODUCT_TABLE_COLUMN_ID.minPrice]: applyMinPriceFilter,
  [PRODUCT_TABLE_COLUMN_ID.stock]: applyTotalStockFilter,
}

export const hasAdminProductsListColumnFilters = (columnFilters: AdminProductsListColumnFilters): boolean =>
  columnFilters.minPrice !== undefined || columnFilters.totalStock !== undefined || columnFilters.createdAt !== undefined

export const parseAdminProductsListColumnFilters = (columnFilters: ColumnFiltersState): AdminProductsListColumnFilters =>
  columnFilters.reduce<AdminProductsListColumnFilters>((filters, { id, value }) => {
    const handler = ADMIN_PRODUCTS_COLUMN_FILTER_HANDLERS[id]

    return handler === undefined ? filters : handler(filters, value)
  }, {})

export const parseAdminProductsListSort = (sorting: SortingState): AdminProductsListSort | undefined => {
  const [active] = sorting
  if (active === undefined || !SERVER_SORTABLE_COLUMN_IDS.has(active.id)) {
    return undefined
  }

  return {
    columnId: active.id,
    desc: active.desc,
  }
}

export const adminProductsListSortRequiresVariantStats = (sort: AdminProductsListSort | undefined): boolean => {
  if (sort === undefined) {
    return false
  }

  return (
    sort.columnId === PRODUCT_TABLE_COLUMN_ID.minPrice ||
    sort.columnId === PRODUCT_TABLE_COLUMN_ID.stock ||
    sort.columnId === PRODUCT_TABLE_COLUMN_ID.variantKind
  )
}

export const formPathToZodPath = (formPath: ProductSkuFormFieldPath): (string | number)[] => {
  if (formPath === "simpleVariant.sku") {
    return ["simpleVariant", "sku"]
  }

  const variantIndex = VARIANT_SKU_PATH_REGEX.exec(formPath)?.groups?.["variantIndex"]
  if (variantIndex !== undefined) {
    return ["variants", Number(variantIndex), "sku"]
  }

  return []
}

export const collectProductFormSkuEntries = (values: ProductFormValues): ProductFormSkuEntry[] => {
  if (!values.hasVariants) {
    const sku = values.simpleVariant?.sku.trim() ?? EMPTY_SKU
    if (sku === EMPTY_SKU) {
      return []
    }

    return [
      {
        formPath: "simpleVariant.sku",
        sku,
      },
    ]
  }

  return values.variants.flatMap((variant, index): ProductFormSkuEntry[] => {
    const sku = variant.sku.trim()
    if (sku === EMPTY_SKU) {
      return []
    }

    return [
      {
        formPath: `variants.${index}.sku`,
        sku,
      },
    ]
  })
}

export const collectSkusFromCatalogInput = (input: CatalogUpsertInput): string[] => {
  if (!input.hasVariants) {
    const sku = input.simpleVariant?.sku.trim() ?? EMPTY_SKU

    return sku === EMPTY_SKU ? [] : [sku]
  }

  return input.variants.map((variant) => variant.sku.trim()).filter((sku) => sku !== EMPTY_SKU)
}

export const buildProductLevelAttributeRows = (values: ProductFormValues) => {
  if (values.hasVariants) {
    return []
  }

  return values.attributeValues
    .filter((row) => row.attributeId.trim() !== "" && row.value.trim() !== "")
    .map((row, index) => ({
      attributeId: row.attributeId,
      id: row.id,
      rank: index,
      value: row.value.trim(),
    }))
}

export const buildVariantAttributeGroups = (values: ProductFormValues) =>
  values.variants
    .filter(
      (
        variant,
      ): variant is typeof variant & {
        id: string
      } => variant.id !== undefined,
    )
    .map((variant) => ({
      values: (variant.attributeValues ?? [])
        .filter((row) => row.attributeId.trim() !== "" && row.value.trim() !== "")
        .map((row, index) => ({
          attributeId: row.attributeId,
          id: row.id,
          rank: index,
          value: row.value.trim(),
        })),
      variantId: variant.id,
    }))
    .filter((group) => group.values.length > 0)

export const buildAllProductImageRows = (values: ProductFormValues) => {
  const sharedImages = galleryImagesToReplacePayload(values.images, values.mainImageId)
  const variantImages = values.variants.flatMap((variant) => {
    if (variant.id === undefined) {
      return []
    }

    return galleryImagesToReplacePayload(variant.images ?? [], variant.mainImageId, variant.id)
  })

  return [...sharedImages, ...variantImages]
}

const collectErrorMessages = (error: unknown): string[] => {
  const messages: string[] = []
  let current: unknown = error
  while (current instanceof Error) {
    if (current.message !== "") {
      messages.push(current.message)
    }
    current = current.cause
  }

  return messages
}

export const isDuplicateHandleMutationError = (error: unknown): boolean =>
  collectErrorMessages(error).some(
    (message) => message === PRODUCT_ERROR_CODES.DUPLICATE_HANDLE || message.includes(UNIQUE_PRODUCT_HANDLE_CONSTRAINT),
  )

export const isDuplicateSkuMutationError = (error: unknown): boolean =>
  collectErrorMessages(error).some(
    (message) => message === PRODUCT_ERROR_CODES.DUPLICATE_SKU || message.includes(UNIQUE_PRODUCT_VARIANT_SKU_CONSTRAINT),
  )

export const isReservedInCheckoutMutationError = (error: unknown): boolean =>
  collectErrorMessages(error).includes(PRODUCT_ERROR_CODES.RESERVED_IN_CHECKOUT)

export const isStockChangedWhileEditingMutationError = (error: unknown): boolean =>
  collectErrorMessages(error).some(
    (message) => message === PRODUCT_ERROR_CODES.STOCK_CHANGED_WHILE_EDITING || message.includes(NEGATIVE_AVAILABLE_STOCK_CONSTRAINT),
  )

export const isDuplicateAttributeOnProductMutationError = (error: unknown): boolean =>
  collectErrorMessages(error).some(
    (message) =>
      message.includes("attribute_on_product_product_attribute_uidx") ||
      message.includes("attribute_on_product.product_id, attribute_on_product.attribute_id"),
  )

export const isDatabaseSchemaOutdatedMutationError = (error: unknown): boolean =>
  collectErrorMessages(error).some(
    (message) => message.includes("no such column") || (message.includes("Failed query") && message.includes('"titles"')),
  )

export const resolveProductMutationErrorMessage = (error: unknown): string => collectErrorMessages(error).at(-1) ?? ""

export const rethrowProductMutationError = (error: unknown): never => {
  if (isDuplicateHandleMutationError(error)) {
    throw new AppError(ERROR_CODES.CONFLICT, PRODUCT_ERROR_CODES.DUPLICATE_HANDLE)
  }

  if (isDuplicateSkuMutationError(error)) {
    throw new AppError(ERROR_CODES.CONFLICT, PRODUCT_ERROR_CODES.DUPLICATE_SKU)
  }

  if (isStockChangedWhileEditingMutationError(error)) {
    throw new AppError(ERROR_CODES.CONFLICT, PRODUCT_ERROR_CODES.STOCK_CHANGED_WHILE_EDITING)
  }

  throw error
}

const normalizeVariantSnapshots = (product: AdminProductDetail): ProductAuditVariantSnapshot[] =>
  product.variants
    .map((variant) => ({
      price: variant.price,
      quantity: variant.inventory?.quantityAvailable ?? 0,
      sku: variant.sku ?? "",
    }))
    .toSorted((left, right) => left.sku.localeCompare(right.sku))

export const extractProductAuditSnapshot = (product: AdminProductDetail): ProductAuditSnapshot => {
  const variants = normalizeVariantSnapshots(product)

  return {
    status: product.status,
    totalStock: variants.reduce((sum, variant) => sum + variant.quantity, 0),
    variants,
  }
}

const variantsChanged = (before: readonly ProductAuditVariantSnapshot[], after: readonly ProductAuditVariantSnapshot[]): boolean => {
  if (before.length !== after.length) {
    return true
  }

  return before.some((variant, index) => {
    const next = after[index]

    return variant.price !== next?.price || variant.quantity !== next.quantity || variant.sku !== next.sku
  })
}

export const buildProductAuditChange = (
  before: ProductAuditSnapshot | undefined,
  after: ProductAuditSnapshot,
): {
  metadata?: Record<string, unknown>
} => {
  if (before === undefined) {
    return {}
  }

  const baseChange = buildAuditChangeMetadata(before, after, ["status", "totalStock"])
  const hasVariantChange = variantsChanged(before.variants, after.variants)
  if (baseChange === undefined && !hasVariantChange) {
    return {}
  }

  const changed = [...(baseChange?.changed ?? [])]
  if (hasVariantChange) {
    changed.push("variants")
  }

  const metadata: AuditChangeMetadata<ProductAuditSnapshot, ProductAuditSnapshot> = {
    changed,
    new: {
      ...baseChange?.new,
      ...(hasVariantChange
        ? {
            variants: [...after.variants],
          }
        : {}),
    },
    old: {
      ...baseChange?.old,
      ...(hasVariantChange
        ? {
            variants: [...before.variants],
          }
        : {}),
    },
  }

  return {
    metadata: toAuditMetadataRecord(metadata),
  }
}
