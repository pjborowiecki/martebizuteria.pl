import { v7 as uuidv7 } from "uuid"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { formatCentsToMoneyInput } from "~/src/modules/_core/utils/currency"
import { resolveAdditionalCategoryIds, resolvePrimaryCategoryId } from "~/src/modules/category-on-product/category-on-product.utils"
import { resolveCollectionIds } from "~/src/modules/collection-on-product/collection-on-product.utils"
import { createEmptyProductAttributeLocaleMap } from "~/src/modules/product-attribute/product-attribute.utils"
import { type ProductImageFormRow, isProductLevelImage } from "~/src/modules/product-image/product-image.utils"
import {
  type ProductOptionDraft,
  type ProductOptionValueDraft,
  buildVariantCombinationKey,
  buildVariantCombinationsFromFormDrafts,
  buildVariantDisplayTitle,
  inferHasVariants,
} from "~/src/modules/product-variant/product-variant.utils"
import { PRODUCT_ADMIN_STATUS, PRODUCT_STATUSES, type ProductStatus } from "~/src/modules/product/product.constants"
import {
  type AdminProductDetail,
  coerceProductLocaleMap,
  coerceProductTagsLocaleMap,
  createEmptyProductTagsLocaleMap,
  toProductAdminStatus,
} from "~/src/modules/product/product.utils"
import { type CatalogUpsertInput, type ProductFormValues } from "~/src/modules/product/product.zod"

import { resolveMainImageId } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-image-form.utils"
import { ensureImplicitVariantOptions } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-variant-form.utils"

const isProductStatus = (value: string): value is ProductStatus => (PRODUCT_STATUSES as readonly string[]).includes(value)

export const createEmptyProductFormValues = (): ProductFormValues => ({
  additionalCategoryIds: [],
  attributeValues: [],
  collectionIds: [],
  descriptions: createEmptyProductAttributeLocaleMap(),
  handle: "",
  hasVariants: false,
  images: [],
  mainImageId: undefined,
  options: [],
  primaryCategoryId: "",
  simpleVariant: {
    compareAtPrice: "",
    manageInventory: true,
    price: "",
    quantity: 0,
    sku: "",
  },
  status: PRODUCT_ADMIN_STATUS.DRAFT,
  subtitles: createEmptyProductAttributeLocaleMap(),
  tags: createEmptyProductTagsLocaleMap(),
  titles: createEmptyProductAttributeLocaleMap(),
  variants: [],
})

const mapVariantImages = (
  images: readonly {
    readonly id: string
    readonly url: string
    readonly alt?: string | null
  }[],
): {
  images: ProductImageFormRow[]
  mainImageId: string | undefined
} => {
  const mapped = images.map((image) => ({
    alt: image.alt ?? "",
    id: image.id,
    url: image.url,
  }))

  return {
    images: mapped,
    mainImageId: mapped[0]?.id,
  }
}

const resolveVariantImageRows = (
  variant: ProductDetailVariant,
  productImages: AdminProductDetail["images"],
): readonly {
  readonly alt?: string | null
  readonly id: string
  readonly url: string
}[] => {
  const relationImages = variant.images
  if (relationImages.length > 0) {
    return relationImages
  }

  return productImages.filter((image) => image.variantId === variant.id).toSorted((left, right) => left.rank - right.rank)
}

const buildFormOptionValues = (option: ProductOptionDraft, value: ProductOptionValueDraft, index: number): Record<string, string> => {
  const optionId = option.id ?? option.titles[I18N.DEFAULT_LOCALE]
  let valueId = value.id
  if (valueId === undefined || valueId === "") {
    valueId = value.labels[I18N.DEFAULT_LOCALE] === "" ? `__draft_${index}` : value.labels[I18N.DEFAULT_LOCALE]
  }

  return {
    [optionId]: valueId,
  }
}

const mapVariantRow = (variant: ProductDetailVariant, context: VariantRowMapContext): ProductFormValues["variants"][number] => {
  const { optionValues, options, productImages } = context
  const media = mapVariantImages(resolveVariantImageRows(variant, productImages))

  return {
    attributeValues: variant.attributes.map((row) => ({
      attributeId: row.attributeId,
      id: row.id,
      rank: row.rank,
      value: row.value,
    })),
    compareAtPrice: variant.compareAtPrice === null ? "" : formatCentsToMoneyInput(variant.compareAtPrice),
    id: variant.id,
    images: media.images,
    mainImageId: media.mainImageId,
    manageInventory: true,
    optionValues,
    price: formatCentsToMoneyInput(variant.price),
    quantity: variant.inventory?.quantityAvailable ?? 0,
    sku: variant.sku ?? "",
    title: buildVariantDisplayTitle(optionValues, options, I18N.DEFAULT_LOCALE),
  }
}

const mapOptions = (product: AdminProductDetail): ProductFormValues["options"] =>
  product.options.map((option) => ({
    id: option.id,
    titles: coerceProductLocaleMap(option.titles),
    values: option.values.map((value) => ({
      id: value.id,
      labels: coerceProductLocaleMap(value.labels),
    })),
  }))

const takeMatchingVariant = (
  variants: Set<ProductDetailVariant>,
  predicate: (variant: ProductDetailVariant) => boolean,
): ProductDetailVariant | undefined => {
  for (const variant of variants) {
    if (predicate(variant)) {
      variants.delete(variant)

      return variant
    }
  }

  return undefined
}

const sortVariantsByOptionValueRank = (
  productVariants: readonly ProductDetailVariant[],
  options: readonly ProductOptionDraft[],
): ProductDetailVariant[] => {
  const [option] = options
  if (option === undefined) {
    return [...productVariants]
  }

  const valueRankById = new Map(option.values.map((value, index) => [value.id ?? "", index] as const))
  const maxRank = option.values.length

  return [...productVariants].toSorted((left, right) => {
    const leftRank = valueRankById.get(left.optionOnVariants[0]?.value.id ?? "") ?? maxRank
    const rightRank = valueRankById.get(right.optionOnVariants[0]?.value.id ?? "") ?? maxRank
    if (leftRank !== rightRank) {
      return leftRank - rightRank
    }

    return left.title.localeCompare(right.title)
  })
}

const createEmptyVariantFormRow = (
  option: ProductOptionDraft,
  value: ProductOptionValueDraft,
  index: number,
): ProductFormValues["variants"][number] => {
  const optionValues = buildFormOptionValues(option, value, index)

  return {
    attributeValues: [],
    compareAtPrice: "",
    id: uuidv7(),
    images: [],
    mainImageId: undefined,
    manageInventory: true,
    optionValues,
    price: "",
    quantity: 0,
    sku: "",
    title: buildVariantDisplayTitle(optionValues, [option], I18N.DEFAULT_LOCALE),
  }
}

const mapVariantsToFormRows = (
  productVariants: readonly ProductDetailVariant[],
  options: ProductOptionDraft[],
  productImages: AdminProductDetail["images"],
): ProductFormValues["variants"] => {
  const [option] = options
  if (option === undefined) {
    return []
  }

  const remainingVariants = new Set(sortVariantsByOptionValueRank(productVariants, options))
  // Reserve explicit identities before legacy fallbacks so no stored variant can populate two rows.
  const linkedVariants = option.values.map((value) =>
    takeMatchingVariant(
      remainingVariants,
      (variant) => value.id !== undefined && value.id !== "" && variant.optionOnVariants.some((row) => row.value.id === value.id),
    ),
  )
  const namedVariants = option.values.map(
    (value, index) =>
      linkedVariants[index] ??
      takeMatchingVariant(remainingVariants, (variant) => variant.title.trim() === value.labels[I18N.DEFAULT_LOCALE].trim()),
  )

  return option.values.map((value, index) => {
    const optionValues = buildFormOptionValues(option, value, index)
    const dbVariant = namedVariants[index] ?? remainingVariants.values().next().value
    if (dbVariant === undefined) {
      return createEmptyVariantFormRow(option, value, index)
    }

    remainingVariants.delete(dbVariant)

    return mapVariantRow(dbVariant, {
      optionValues,
      options,
      productImages,
    })
  })
}

const mapProductImages = (
  product: AdminProductDetail,
): {
  images: ProductImageFormRow[]
  mainImageId: string | undefined
} => {
  const sharedImages = product.images.filter((image) => isProductLevelImage(image.variantId))
  const sorted = [...sharedImages].toSorted((left, right) => left.rank - right.rank)
  const images = sorted.map((image) => ({
    alt: image.alt ?? "",
    id: image.id,
    url: image.url,
  }))

  return {
    images,
    mainImageId: resolveMainImageId(images, product.thumbnail),
  }
}

export const mapProductDetailToFormValues = (product: AdminProductDetail): ProductFormValues => {
  const options = mapOptions(product)
  const hasVariants = inferHasVariants(product.options, product.variants.length)
  const formOptions = hasVariants ? ensureImplicitVariantOptions(options) : []
  const productVariants: readonly ProductDetailVariant[] = product.variants
  const [firstVariant] = productVariants
  const media = mapProductImages(product)

  return {
    additionalCategoryIds: resolveAdditionalCategoryIds(product.categories),
    attributeValues: product.attributes
      .filter((row) => row.variantId === null)
      .map((row) => ({
        attributeId: row.attributeId,
        id: row.id,
        rank: row.rank,
        value: row.value,
      })),
    collectionIds: resolveCollectionIds(product.collections),
    descriptions: coerceProductLocaleMap(product.descriptions),
    handle: product.handle,
    hasVariants,
    images: media.images,
    mainImageId: media.mainImageId,
    options: formOptions,
    primaryCategoryId: resolvePrimaryCategoryId(product.categories) ?? "",
    simpleVariant:
      firstVariant === undefined
        ? createEmptyProductFormValues().simpleVariant
        : {
            compareAtPrice: firstVariant.compareAtPrice === null ? "" : formatCentsToMoneyInput(firstVariant.compareAtPrice),
            manageInventory: firstVariant.manageInventory,
            price: formatCentsToMoneyInput(firstVariant.price),
            quantity: firstVariant.inventory?.quantityAvailable ?? 0,
            sku: firstVariant.sku ?? "",
          },
    status: isProductStatus(product.status) ? toProductAdminStatus(product.status) : PRODUCT_ADMIN_STATUS.DRAFT,
    subtitles: coerceProductLocaleMap(product.subtitles),
    tags: coerceProductTagsLocaleMap(product.tags ?? EMPTY_TAGS),
    titles: coerceProductLocaleMap(product.titles),
    variants: hasVariants ? mapVariantsToFormRows(productVariants, formOptions, product.images) : [],
  }
}

export const regenerateVariantRows = (
  options: readonly ProductOptionDraft[],
  currentVariants: readonly Partial<VariantFormRow>[],
): ProductFormValues["variants"] => {
  const combinations = buildVariantCombinationsFromFormDrafts(options)

  return combinations.map((combination, index) => {
    const combinationKey = buildVariantCombinationKey(combination.optionValues)
    const existing =
      currentVariants[index] ??
      currentVariants.find((row) => row.optionValues !== undefined && buildVariantCombinationKey(row.optionValues) === combinationKey)
    return {
      attributeValues: existing?.attributeValues ?? [],
      compareAtPrice: existing?.compareAtPrice ?? "",
      id: existing?.id ?? uuidv7(),
      images: existing?.images ?? [],
      mainImageId: existing?.mainImageId ?? existing?.images?.[0]?.id,
      manageInventory: true,
      optionValues: combination.optionValues,
      price: existing?.price ?? "",
      quantity: existing?.quantity ?? 0,
      sku: existing?.sku ?? "",
      title: buildVariantDisplayTitle(combination.optionValues, options, I18N.DEFAULT_LOCALE),
    }
  })
}

export const toCatalogUpsertPayload = (values: CatalogUpsertInput, productId: string) => ({
  ...values,
  id: productId,
})

const EMPTY_TAGS = createEmptyProductTagsLocaleMap()

type AdminProductVariant = AdminProductDetail["variants"][number]

type ProductDetailVariant = Omit<AdminProductVariant, "inventory"> & {
  readonly inventory?: AdminProductVariant["inventory"] | null
}

interface VariantRowMapContext {
  readonly optionValues: Record<string, string>
  readonly options: ProductOptionDraft[]
  readonly productImages: AdminProductDetail["images"]
}

type VariantFormRow = ProductFormValues["variants"][number]
