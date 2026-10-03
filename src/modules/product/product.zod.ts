import { createSchemaFactory } from "drizzle-zod"
import zod from "zod/v4"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { isCompareAtValid, isSellPriceCentsValid, parseMoneyInputToMinorUnits } from "~/src/modules/_core/utils/currency"
import {
  dateColumnFilterField,
  handleField,
  idField,
  numericColumnFilterField,
  pageField,
  pageSizeField,
} from "~/src/modules/_core/utils/zod-fields"
import { attributeOnProductZodSchemas } from "~/src/modules/attribute-on-product/attribute-on-product.zod"
import { PRODUCT_IMAGE_COLUMN_LENGTH } from "~/src/modules/product-image/product-image.constants"
import { MAX_PRODUCT_OPTIONS, buildVariantCombinations } from "~/src/modules/product-variant/product-variant.utils"
import { collectProductFormSkuEntries, formPathToZodPath } from "~/src/modules/product/product-sku.validation.utils"
import {
  PRODUCT_ADMIN_STATUS,
  PRODUCT_COLUMN_LENGTH,
  PRODUCT_FORM_VALIDATION_KEYS,
  PRODUCT_HANDLE_PATTERN,
  PRODUCT_INVENTORY_LEVEL,
  PRODUCT_MIN_LENGTH,
  PRODUCT_STATUSES,
  PRODUCT_VARIANT_KIND,
} from "~/src/modules/product/product.constants"
import { product } from "~/src/modules/product/product.schema"

const { createSelectSchema } = createSchemaFactory({
  zodInstance: zod,
})

const productSelectSchema = createSelectSchema(product)

const productIdSchema = zod.string().trim().min(PRODUCT_MIN_LENGTH)

const productLocaleMapSchema = (maxLength: number, tooLongMessage?: string) =>
  zod.object(Object.fromEntries(I18N.SUPPORTED_LOCALES.map((locale) => [locale, zod.string().trim().max(maxLength, tooLongMessage)])))

const productLocaleMapRequiredSchema = (maxLength: number) =>
  productLocaleMapSchema(maxLength).superRefine((map, context) => {
    for (const locale of I18N.SUPPORTED_LOCALES) {
      if (map[locale].trim() === "") {
        context.addIssue({
          code: "custom",
          message: PRODUCT_FORM_VALIDATION_KEYS.localeTitleRequired,
          path: [locale],
        })
      }
    }
  })

const productTagsLocaleMapSchema = () =>
  zod.object(Object.fromEntries(I18N.SUPPORTED_LOCALES.map((locale) => [locale, zod.array(zod.string().trim().min(PRODUCT_MIN_LENGTH))])))

const productTitlesSchema = productLocaleMapRequiredSchema(PRODUCT_COLUMN_LENGTH.title)

const productSubtitlesSchema = productLocaleMapSchema(PRODUCT_COLUMN_LENGTH.subtitle)

const productDescriptionsSchema = productLocaleMapSchema(PRODUCT_COLUMN_LENGTH.description)

const plnMoneyInputSchema = zod
  .string()
  .trim()
  .superRefine((value, ctx) => {
    if (value === "") {
      return
    }

    if (parseMoneyInputToMinorUnits(value, STORE_CURRENCY_CODE) === undefined) {
      ctx.addIssue({
        code: "custom",
        message: PRODUCT_FORM_VALIDATION_KEYS.priceInvalid,
      })
    }
  })

const simpleVariantInputSchema = zod.object({
  compareAtPrice: plnMoneyInputSchema,
  manageInventory: zod.boolean(),
  price: plnMoneyInputSchema,
  quantity: zod.number().int().min(0),
  sku: zod.string().trim().max(PRODUCT_COLUMN_LENGTH.sku),
})

const productOptionValueInputSchema = zod.object({
  id: zod.string().optional(),
  labels: productLocaleMapRequiredSchema(PRODUCT_COLUMN_LENGTH.optionValue),
})

const productOptionInputSchema = zod.object({
  id: zod.string().optional(),
  titles: productLocaleMapRequiredSchema(PRODUCT_COLUMN_LENGTH.optionTitle),
  values: zod.array(productOptionValueInputSchema).min(PRODUCT_MIN_LENGTH),
})

const productImageFormRowSchema = zod.object({
  alt: zod.string().trim(),
  id: zod.string().trim().min(PRODUCT_MIN_LENGTH),
  url: zod.string().trim().min(PRODUCT_MIN_LENGTH),
})

const variantAttributeValueFormRowSchema = zod.object({
  attributeId: zod.string().trim(),
  id: zod.string().optional(),
  rank: zod.number().int().min(0).optional(),
  value: zod.string().trim(),
})

const variantRowInputSchema = zod.object({
  attributeValues: zod.array(variantAttributeValueFormRowSchema).optional(),
  compareAtPrice: plnMoneyInputSchema,
  id: zod.string().optional(),
  images: zod.array(productImageFormRowSchema).optional(),
  mainImageId: zod.string().optional(),
  manageInventory: zod.boolean(),
  optionValues: zod.record(zod.string(), zod.string()),
  price: plnMoneyInputSchema,
  quantity: zod.number().int().min(0),
  sku: zod.string().trim().max(PRODUCT_COLUMN_LENGTH.sku),
  title: zod.string().trim().optional(),
})

const catalogUpsertBaseSchema = zod.object({
  additionalCategoryIds: zod.array(zod.uuid()),
  collectionIds: zod.array(zod.uuid()),
  descriptions: productDescriptionsSchema,
  handle: zod
    .string()
    .trim()
    .min(PRODUCT_MIN_LENGTH, {
      message: PRODUCT_FORM_VALIDATION_KEYS.slugRequired,
    })
    .max(PRODUCT_COLUMN_LENGTH.handle, {
      message: PRODUCT_FORM_VALIDATION_KEYS.slugTooLong,
    })
    .regex(PRODUCT_HANDLE_PATTERN, {
      message: PRODUCT_FORM_VALIDATION_KEYS.slugInvalid,
    }),
  hasVariants: zod.boolean(),
  options: zod.array(productOptionInputSchema).max(MAX_PRODUCT_OPTIONS),
  primaryCategoryId: zod.union([zod.literal(""), zod.uuid()]),
  simpleVariant: simpleVariantInputSchema.optional(),
  status: zod.enum([PRODUCT_ADMIN_STATUS.DRAFT, PRODUCT_ADMIN_STATUS.ACTIVE, PRODUCT_ADMIN_STATUS.ARCHIVED]),
  subtitles: productSubtitlesSchema,
  tags: productTagsLocaleMapSchema(),
  titles: productTitlesSchema,
  variants: zod.array(variantRowInputSchema),
})

const refineOrganizationRelations = (data: zod.infer<typeof catalogUpsertBaseSchema>, ctx: zod.RefinementCtx): void => {
  if (data.primaryCategoryId === "") {
    ctx.addIssue({
      code: "custom",
      message: PRODUCT_FORM_VALIDATION_KEYS.primaryCategoryRequired,
      path: ["primaryCategoryId"],
    })
  }
}

const refineSimpleProductPrice = (data: zod.infer<typeof catalogUpsertBaseSchema>, ctx: zod.RefinementCtx): void => {
  const simple = data.simpleVariant
  if (simple === undefined) {
    return
  }

  const priceCents = parseMoneyInputToMinorUnits(simple.price, STORE_CURRENCY_CODE)
  if (priceCents === undefined) {
    ctx.addIssue({
      code: "custom",
      message: PRODUCT_FORM_VALIDATION_KEYS.priceInvalid,
      path: ["simpleVariant", "price"],
    })

    return
  }

  if (!isSellPriceCentsValid(priceCents)) {
    ctx.addIssue({
      code: "custom",
      message: PRODUCT_FORM_VALIDATION_KEYS.priceRequired,
      path: ["simpleVariant", "price"],
    })
  }
}

const refineActiveProductPricing = (data: zod.infer<typeof catalogUpsertBaseSchema>, ctx: zod.RefinementCtx): void => {
  if (data.status !== PRODUCT_ADMIN_STATUS.ACTIVE) {
    return
  }

  if (!data.hasVariants) {
    const simple = data.simpleVariant
    if (simple === undefined) {
      return
    }

    const priceCents = parseMoneyInputToMinorUnits(simple.price, STORE_CURRENCY_CODE)
    if (priceCents === undefined || !isCompareAtValid(priceCents, simple.compareAtPrice)) {
      ctx.addIssue({
        code: "custom",
        message: PRODUCT_FORM_VALIDATION_KEYS.compareAtInvalid,
        path: ["simpleVariant", "compareAtPrice"],
      })
    }

    return
  }
  data.variants.forEach((variant, index) => {
    const priceCents = parseMoneyInputToMinorUnits(variant.price, STORE_CURRENCY_CODE)
    if (priceCents === undefined) {
      ctx.addIssue({
        code: "custom",
        message: PRODUCT_FORM_VALIDATION_KEYS.priceInvalid,
        path: ["variants", index, "price"],
      })
    } else if (!isSellPriceCentsValid(priceCents)) {
      ctx.addIssue({
        code: "custom",
        message: PRODUCT_FORM_VALIDATION_KEYS.activePriceRequired,
        path: ["variants", index, "price"],
      })
    }

    if (priceCents === undefined || !isCompareAtValid(priceCents, variant.compareAtPrice)) {
      ctx.addIssue({
        code: "custom",
        message: PRODUCT_FORM_VALIDATION_KEYS.compareAtInvalid,
        path: ["variants", index, "compareAtPrice"],
      })
    }
  })
}

const productImageReplaceRowSchema = zod.object({
  alt: zod.string().trim().optional(),
  id: zod.string().trim().min(PRODUCT_MIN_LENGTH).optional(),
  rank: zod.number().int().min(0),
  url: zod.string().trim().min(PRODUCT_MIN_LENGTH).max(PRODUCT_IMAGE_COLUMN_LENGTH.url),
  variantId: zod.string().optional(),
})

const productAttributeValueFormRowSchema = zod.object({
  attributeId: zod.string().trim(),
  id: zod.string().optional(),
  rank: zod.number().int().min(0).optional(),
  value: zod.string().trim(),
})

const productMediaFormFields = {
  attributeValues: zod.array(productAttributeValueFormRowSchema),
  images: zod.array(productImageFormRowSchema),
  mainImageId: zod.string().optional(),
} as const

const refineDuplicateSkusInForm = (data: ProductFormValues, ctx: zod.RefinementCtx): void => {
  const entries = collectProductFormSkuEntries(data)
  const entriesBySku = new Map<string, (typeof entries)[number][]>()
  for (const entry of entries) {
    const group = entriesBySku.get(entry.sku) ?? []
    group.push(entry)
    entriesBySku.set(entry.sku, group)
  }

  const MIN_DUPLICATE_SKU_GROUP_SIZE = 2
  for (const group of entriesBySku.values()) {
    if (group.length >= MIN_DUPLICATE_SKU_GROUP_SIZE) {
      for (const entry of group) {
        ctx.addIssue({
          code: "custom",
          message: PRODUCT_FORM_VALIDATION_KEYS.duplicateSku,
          path: formPathToZodPath(entry.formPath),
        })
      }
    }
  }
}

const refineDuplicateProductAttributes = (data: ProductFormValues, ctx: zod.RefinementCtx): void => {
  const seenAttributeIds = new Set<string>()
  data.attributeValues.forEach((row, index) => {
    const attributeId = row.attributeId.trim()
    if (attributeId === "") {
      return
    }

    if (seenAttributeIds.has(attributeId)) {
      ctx.addIssue({
        code: "custom",
        message: PRODUCT_FORM_VALIDATION_KEYS.duplicateAttribute,
        path: ["attributeValues", index, "attributeId"],
      })

      return
    }
    seenAttributeIds.add(attributeId)
  })
}

const refineCatalogUpsert = (data: zod.infer<typeof catalogUpsertBaseSchema>, ctx: zod.RefinementCtx): void => {
  refineOrganizationRelations(data, ctx)
  if (!data.hasVariants) {
    if (data.simpleVariant === undefined) {
      ctx.addIssue({
        code: "custom",
        message: PRODUCT_FORM_VALIDATION_KEYS.simpleVariantRequired,
        path: ["simpleVariant"],
      })
    }
    refineSimpleProductPrice(data, ctx)
    refineActiveProductPricing(data, ctx)

    return
  }

  if (data.options.length === 0) {
    ctx.addIssue({
      code: "custom",
      message: PRODUCT_FORM_VALIDATION_KEYS.optionsRequired,
      path: ["options"],
    })
  }

  if (data.variants.length === 0) {
    ctx.addIssue({
      code: "custom",
      message: PRODUCT_FORM_VALIDATION_KEYS.variantsRequired,
      path: ["variants"],
    })
  } else if (data.status === PRODUCT_ADMIN_STATUS.ACTIVE && data.variants.length < buildVariantCombinations(data.options).length) {
    ctx.addIssue({
      code: "custom",
      message: PRODUCT_FORM_VALIDATION_KEYS.variantCombinationsRequired,
      path: ["variants"],
    })
  }
  refineActiveProductPricing(data, ctx)
}

const catalogUpsertInputSchema = catalogUpsertBaseSchema.superRefine(refineCatalogUpsert)

const variantAttributeValuesRowSchema = zod.object({
  values: zod.array(attributeOnProductZodSchemas.row),
  variantId: zod.string().trim().min(PRODUCT_MIN_LENGTH).max(PRODUCT_COLUMN_LENGTH.id),
})

const productFormSchemaDefinition = zod
  .object({
    ...catalogUpsertBaseSchema.shape,
    descriptions: productLocaleMapSchema(PRODUCT_COLUMN_LENGTH.description, PRODUCT_FORM_VALIDATION_KEYS.descriptionTooLong),
    subtitles: productLocaleMapSchema(PRODUCT_COLUMN_LENGTH.subtitle, PRODUCT_FORM_VALIDATION_KEYS.subtitleTooLong),
    tags: productTagsLocaleMapSchema(),
    titles: productTitlesSchema,
    ...productMediaFormFields,
  })
  .superRefine((data, ctx) => {
    refineDuplicateSkusInForm(data, ctx)
    refineDuplicateProductAttributes(data, ctx)
    refineCatalogUpsert(data, ctx)
  })

export type ProductFormValues = zod.output<typeof productFormSchemaDefinition>

export type CatalogUpsertInput = zod.infer<typeof catalogUpsertInputSchema>

const withInventoryAlwaysTracked = (input: CatalogUpsertInput): CatalogUpsertInput => ({
  ...input,
  simpleVariant:
    input.simpleVariant === undefined
      ? undefined
      : {
          ...input.simpleVariant,
          manageInventory: true,
        },
  variants: input.variants.map((row) => ({
    ...row,
    manageInventory: true,
  })),
})

export const parseCatalogUpsertInput = (values: ProductFormValues): CatalogUpsertInput => {
  const { attributeValues: _attributeValues, images: _images, mainImageId: _mainImageId, ...catalog } = values
  const parsed = catalogUpsertInputSchema.parse({
    ...catalog,
    variants: catalog.variants.map(
      ({ attributeValues: _variantAttributes, images: _variantImages, mainImageId: _variantMainImageId, ...variant }) => variant,
    ),
  })

  return withInventoryAlwaysTracked(parsed)
}

const adminProductsFiltersSchema = zod.object({
  categoryId: zod.string().optional(),
  collectionId: zod.string().optional(),
  createdAt: dateColumnFilterField.optional(),
  inventoryLevel: zod.enum(PRODUCT_INVENTORY_LEVEL).optional(),
  minPrice: numericColumnFilterField.optional(),
  search: zod.string().optional(),
  sort: zod
    .object({
      columnId: zod.string(),
      desc: zod.boolean(),
    })
    .optional(),
  status: zod.enum(PRODUCT_STATUSES).optional(),
  totalStock: numericColumnFilterField.optional(),
  variantKind: zod.enum(PRODUCT_VARIANT_KIND).optional(),
})

export const productZodSchemas = {
  adminListItem: productSelectSchema.extend({
    attributeTitles: zod.string().optional(),
    categoryTitle: zod.string().optional(),
    categoryTitles: zod.string().optional(),
    collectionTitles: zod.string().optional(),
    inventoryLevel: zod.enum([PRODUCT_INVENTORY_LEVEL.OUT, PRODUCT_INVENTORY_LEVEL.LOW, PRODUCT_INVENTORY_LEVEL.OK]),
    minPrice: zod.number().optional(),
    skuSummary: zod.string().optional(),
    totalStock: zod.number(),
    variantCount: zod.number(),
  }),
  adminProductsExportInput: adminProductsFiltersSchema,
  adminProductsPageInput: adminProductsFiltersSchema.extend({
    page: pageField.optional(),
    pageSize: pageSizeField.optional(),
  }),
  catalogUpsertInput: catalogUpsertInputSchema,
  createCompleteInput: catalogUpsertInputSchema.extend({
    attributeValues: zod.array(attributeOnProductZodSchemas.row),
    images: zod.array(productImageReplaceRowSchema),
  }),
  createInput: catalogUpsertInputSchema,
  deleteInput: zod.array(productIdSchema).min(PRODUCT_MIN_LENGTH),
  form: productFormSchemaDefinition,
  handleInput: handleField,
  insert: productSelectSchema,
  productByHandleInput: zod.object({
    handle: handleField,
    locale: zod.string().optional(),
  }),
  relatedProductsInput: zod.object({
    categoryId: zod.string().nullish(),
    excludeProductId: idField,
    locale: zod.string(),
  }),
  reorderInput: zod.array(productIdSchema).min(PRODUCT_MIN_LENGTH),
  select: productSelectSchema,
  stats: zod.object({
    active: zod.number(),
    archived: zod.number(),
    draft: zod.number(),
    lowStock: zod.number(),
    total: zod.number(),
  }),
  update: catalogUpsertInputSchema.extend({
    id: productIdSchema,
  }),
  updateCompleteInput: catalogUpsertInputSchema.extend({
    attributeValues: zod.array(attributeOnProductZodSchemas.row),
    id: productIdSchema,
    images: zod.array(productImageReplaceRowSchema),
    variantAttributeValues: zod.array(variantAttributeValuesRowSchema),
  }),
}
