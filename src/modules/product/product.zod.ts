import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod/v4";

import { STORE_CURRENCY_CODE } from "~/src/constants/_constants/currency";
import { LOCALES } from "~/src/constants/_constants/locales";

import { isCompareAtValid, isSellPriceCentsValid, parseMoneyInputToMinorUnits } from "~/src/lib/_utils/currency";

import { attributeOnProductZodSchemas } from "~/src/modules/attribute-on-product/attribute-on-product.zod";
import { PRODUCT_IMAGE_COLUMN_LENGTH } from "~/src/modules/product-image/product-image.constants";
import { MAX_PRODUCT_OPTIONS } from "~/src/modules/product-variant/product-variant.utils";
import { collectProductFormSkuEntries, formPathToZodPath } from "~/src/modules/product/product-sku.validation.utils";
import {
  PRODUCT_ADMIN_STATUS,
  PRODUCT_COLUMN_LENGTH,
  PRODUCT_FORM_VALIDATION_KEYS,
  PRODUCT_HANDLE_PATTERN,
  PRODUCT_INVENTORY_LEVEL,
  PRODUCT_MIN_LENGTH
} from "~/src/modules/product/product.constants";
import { product } from "~/src/modules/product/product.schema";

const { createSelectSchema } = createSchemaFactory({
  zodInstance: z
});

const productSelectSchema = createSelectSchema(product);

const productIdSchema = z.string().trim().min(PRODUCT_MIN_LENGTH);
const MIN_INVENTORY_QUANTITY = 0;

function productLocaleMapSchema(maxLength: number) {
  return z.object(Object.fromEntries(LOCALES.map((locale) => [locale, z.string().trim().max(maxLength)])));
}

function productLocaleMapRequiredSchema(maxLength: number) {
  return productLocaleMapSchema(maxLength).superRefine((map, context) => {
    for (const locale of LOCALES) {
      if (map[locale].trim() === "") {
        context.addIssue({
          code: "custom",
          message: PRODUCT_FORM_VALIDATION_KEYS.localeTitleRequired,
          path: [locale]
        });
      }
    }
  });
}

function productTagsLocaleMapSchema() {
  return z.object(Object.fromEntries(LOCALES.map((locale) => [locale, z.array(z.string().trim().min(PRODUCT_MIN_LENGTH))])));
}

const productTitlesSchema = productLocaleMapRequiredSchema(PRODUCT_COLUMN_LENGTH.title);
const productSubtitlesSchema = productLocaleMapSchema(PRODUCT_COLUMN_LENGTH.subtitle);
const productDescriptionsSchema = productLocaleMapSchema(PRODUCT_COLUMN_LENGTH.description);

const plnMoneyInputSchema = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    if (value === "") {
      return;
    }

    if (parseMoneyInputToMinorUnits(value, STORE_CURRENCY_CODE) === undefined) {
      ctx.addIssue({
        code: "custom",
        message: PRODUCT_FORM_VALIDATION_KEYS.priceInvalid
      });
    }
  });

const simpleVariantInputSchema = z.object({
  compareAtPrice: plnMoneyInputSchema,
  manageInventory: z.boolean(),
  price: plnMoneyInputSchema,
  quantity: z.number().int().min(MIN_INVENTORY_QUANTITY),
  sku: z.string().trim().max(PRODUCT_COLUMN_LENGTH.sku)
});

const productOptionValueInputSchema = z.object({
  id: z.string().optional(),
  labels: productLocaleMapRequiredSchema(PRODUCT_COLUMN_LENGTH.optionValue)
});

const productOptionInputSchema = z.object({
  id: z.string().optional(),
  titles: productLocaleMapRequiredSchema(PRODUCT_COLUMN_LENGTH.optionTitle),
  values: z.array(productOptionValueInputSchema).min(PRODUCT_MIN_LENGTH)
});

const productImageFormRowSchema = z.object({
  alt: z.string().trim(),
  id: z.string().trim().min(PRODUCT_MIN_LENGTH),
  url: z.string().trim().min(PRODUCT_MIN_LENGTH)
});

const variantAttributeValueFormRowSchema = z.object({
  attributeId: z.string().trim(),
  id: z.string().optional(),
  rank: z.number().int().min(MIN_INVENTORY_QUANTITY).optional(),
  value: z.string().trim()
});

const variantRowInputSchema = z.object({
  attributeValues: z.array(variantAttributeValueFormRowSchema).optional(),
  compareAtPrice: plnMoneyInputSchema,
  id: z.string().optional(),
  images: z.array(productImageFormRowSchema).optional(),
  mainImageId: z.string().optional(),
  manageInventory: z.boolean(),
  optionValues: z.record(z.string(), z.string()),
  price: plnMoneyInputSchema,
  quantity: z.number().int().min(MIN_INVENTORY_QUANTITY),
  sku: z.string().trim().max(PRODUCT_COLUMN_LENGTH.sku),
  title: z.string().trim().optional()
});

const EMPTY_OPTIONS_LENGTH = 0;
const EMPTY_VARIANT_ROWS_LENGTH = 0;

const catalogUpsertBaseSchema = z.object({
  additionalCategoryIds: z.array(z.uuid()),
  collectionIds: z.array(z.uuid()),
  descriptions: productDescriptionsSchema,
  handle: z
    .string()
    .trim()
    .min(PRODUCT_MIN_LENGTH, { message: PRODUCT_FORM_VALIDATION_KEYS.slugRequired })
    .max(PRODUCT_COLUMN_LENGTH.handle, { message: PRODUCT_FORM_VALIDATION_KEYS.slugTooLong })
    .regex(PRODUCT_HANDLE_PATTERN, { message: PRODUCT_FORM_VALIDATION_KEYS.slugInvalid }),
  hasVariants: z.boolean(),
  options: z.array(productOptionInputSchema).max(MAX_PRODUCT_OPTIONS),
  primaryCategoryId: z.union([z.literal(""), z.uuid()]),
  simpleVariant: simpleVariantInputSchema.optional(),
  status: z.enum([PRODUCT_ADMIN_STATUS.DRAFT, PRODUCT_ADMIN_STATUS.ACTIVE, PRODUCT_ADMIN_STATUS.ARCHIVED]),
  subtitles: productSubtitlesSchema,
  tags: productTagsLocaleMapSchema(),
  titles: productTitlesSchema,
  variants: z.array(variantRowInputSchema)
});

function refineOrganizationRelations(data: z.infer<typeof catalogUpsertBaseSchema>, ctx: z.RefinementCtx): void {
  if (data.primaryCategoryId === "") {
    ctx.addIssue({
      code: "custom",
      message: PRODUCT_FORM_VALIDATION_KEYS.primaryCategoryRequired,
      path: ["primaryCategoryId"]
    });
  }
}

function refineSimpleProductPrice(data: z.infer<typeof catalogUpsertBaseSchema>, ctx: z.RefinementCtx): void {
  if (data.hasVariants) {
    return;
  }

  const simple = data.simpleVariant;
  if (simple === undefined) {
    return;
  }

  const priceCents = parseMoneyInputToMinorUnits(simple.price, STORE_CURRENCY_CODE);
  if (priceCents === undefined) {
    ctx.addIssue({
      code: "custom",
      message: PRODUCT_FORM_VALIDATION_KEYS.priceInvalid,
      path: ["simpleVariant", "price"]
    });
    return;
  }

  if (!isSellPriceCentsValid(priceCents)) {
    ctx.addIssue({
      code: "custom",
      message: PRODUCT_FORM_VALIDATION_KEYS.priceRequired,
      path: ["simpleVariant", "price"]
    });
  }
}

function refineActiveProductPricing(data: z.infer<typeof catalogUpsertBaseSchema>, ctx: z.RefinementCtx): void {
  if (data.status !== PRODUCT_ADMIN_STATUS.ACTIVE) {
    return;
  }

  if (!data.hasVariants) {
    const simple = data.simpleVariant;
    if (simple === undefined) {
      return;
    }

    const priceCents = parseMoneyInputToMinorUnits(simple.price, STORE_CURRENCY_CODE);
    if (priceCents === undefined || !isCompareAtValid(priceCents, simple.compareAtPrice)) {
      ctx.addIssue({
        code: "custom",
        message: PRODUCT_FORM_VALIDATION_KEYS.compareAtInvalid,
        path: ["simpleVariant", "compareAtPrice"]
      });
    }

    return;
  }

  data.variants.forEach((variant, index) => {
    const priceCents = parseMoneyInputToMinorUnits(variant.price, STORE_CURRENCY_CODE);
    if (priceCents === undefined) {
      ctx.addIssue({
        code: "custom",
        message: PRODUCT_FORM_VALIDATION_KEYS.priceInvalid,
        path: ["variants", index, "price"]
      });
    } else if (!isSellPriceCentsValid(priceCents)) {
      ctx.addIssue({
        code: "custom",
        message: PRODUCT_FORM_VALIDATION_KEYS.activePriceRequired,
        path: ["variants", index, "price"]
      });
    }

    if (priceCents === undefined || !isCompareAtValid(priceCents, variant.compareAtPrice)) {
      ctx.addIssue({
        code: "custom",
        message: PRODUCT_FORM_VALIDATION_KEYS.compareAtInvalid,
        path: ["variants", index, "compareAtPrice"]
      });
    }
  });
}

const productImageReplaceRowSchema = z.object({
  alt: z.string().trim().optional(),
  id: z.string().trim().min(PRODUCT_MIN_LENGTH).optional(),
  rank: z.number().int().min(MIN_INVENTORY_QUANTITY),
  url: z.string().trim().min(PRODUCT_MIN_LENGTH).max(PRODUCT_IMAGE_COLUMN_LENGTH.url),
  variantId: z.string().optional()
});

const productAttributeValueFormRowSchema = z.object({
  attributeId: z.string().trim(),
  id: z.string().optional(),
  rank: z.number().int().min(MIN_INVENTORY_QUANTITY).optional(),
  value: z.string().trim()
});

const productMediaFormFields = {
  attributeValues: z.array(productAttributeValueFormRowSchema),
  images: z.array(productImageFormRowSchema),
  mainImageId: z.string().optional()
} as const;

function refineDuplicateSkusInForm(data: ProductFormValues, ctx: z.RefinementCtx): void {
  const entries = collectProductFormSkuEntries(data);
  const entriesBySku = new Map<string, (typeof entries)[number][]>();

  for (const entry of entries) {
    const group = entriesBySku.get(entry.sku) ?? [];
    group.push(entry);
    entriesBySku.set(entry.sku, group);
  }

  const MIN_DUPLICATE_SKU_GROUP_SIZE = 2;

  for (const group of entriesBySku.values()) {
    if (group.length >= MIN_DUPLICATE_SKU_GROUP_SIZE) {
      for (const entry of group) {
        ctx.addIssue({
          code: "custom",
          message: PRODUCT_FORM_VALIDATION_KEYS.duplicateSku,
          path: formPathToZodPath(entry.formPath)
        });
      }
    }
  }
}

function refineDuplicateProductAttributes(data: ProductFormValues, ctx: z.RefinementCtx): void {
  const seenAttributeIds = new Set<string>();

  data.attributeValues.forEach((row, index) => {
    const attributeId = row.attributeId.trim();
    if (attributeId === "") {
      return;
    }

    if (seenAttributeIds.has(attributeId)) {
      ctx.addIssue({
        code: "custom",
        message: PRODUCT_FORM_VALIDATION_KEYS.duplicateAttribute,
        path: ["attributeValues", index, "attributeId"]
      });
      return;
    }

    seenAttributeIds.add(attributeId);
  });
}

function refineCatalogUpsert(data: z.infer<typeof catalogUpsertBaseSchema>, ctx: z.RefinementCtx): void {
  refineOrganizationRelations(data, ctx);

  if (!data.hasVariants) {
    if (data.simpleVariant === undefined) {
      ctx.addIssue({
        code: "custom",
        message: PRODUCT_FORM_VALIDATION_KEYS.simpleVariantRequired,
        path: ["simpleVariant"]
      });
    }

    refineSimpleProductPrice(data, ctx);
    refineActiveProductPricing(data, ctx);
    return;
  }

  if (data.options.length === EMPTY_OPTIONS_LENGTH) {
    ctx.addIssue({
      code: "custom",
      message: PRODUCT_FORM_VALIDATION_KEYS.optionsRequired,
      path: ["options"]
    });
  }

  if (data.variants.length === EMPTY_VARIANT_ROWS_LENGTH) {
    ctx.addIssue({
      code: "custom",
      message: PRODUCT_FORM_VALIDATION_KEYS.variantsRequired,
      path: ["variants"]
    });
  }

  refineActiveProductPricing(data, ctx);
}

const catalogUpsertInputSchema = catalogUpsertBaseSchema.superRefine(refineCatalogUpsert);

const productFormSchemaDefinition = z
  .object({
    ...catalogUpsertBaseSchema.shape,
    descriptions: z.object(
      Object.fromEntries(
        LOCALES.map((locale) => [
          locale,
          z.string().trim().max(PRODUCT_COLUMN_LENGTH.description, {
            message: PRODUCT_FORM_VALIDATION_KEYS.descriptionTooLong
          })
        ])
      )
    ),
    subtitles: z.object(
      Object.fromEntries(
        LOCALES.map((locale) => [
          locale,
          z.string().trim().max(PRODUCT_COLUMN_LENGTH.subtitle, {
            message: PRODUCT_FORM_VALIDATION_KEYS.subtitleTooLong
          })
        ])
      )
    ),
    tags: productTagsLocaleMapSchema(),
    titles: productTitlesSchema,
    ...productMediaFormFields
  })
  .superRefine((data, ctx) => {
    refineDuplicateSkusInForm(data, ctx);
    refineDuplicateProductAttributes(data, ctx);
    refineCatalogUpsert(data, ctx);
  });

export type ProductFormValues = z.output<typeof productFormSchemaDefinition>;
export type CatalogUpsertInput = z.infer<typeof catalogUpsertInputSchema>;

export function productFormSchema() {
  return productFormSchemaDefinition;
}

/** Inventory is always tracked for catalog products — not exposed in admin UI. */
function withInventoryAlwaysTracked(input: CatalogUpsertInput): CatalogUpsertInput {
  return {
    ...input,
    simpleVariant: input.simpleVariant === undefined ? undefined : { ...input.simpleVariant, manageInventory: true },
    variants: input.variants.map((row) => ({ ...row, manageInventory: true }))
  };
}

export function parseCatalogUpsertInput(values: ProductFormValues): CatalogUpsertInput {
  const { attributeValues: _attributeValues, images: _images, mainImageId: _mainImageId, ...catalog } = values;
  const parsed = catalogUpsertInputSchema.parse({
    ...catalog,
    variants: catalog.variants.map(
      ({ attributeValues: _variantAttributes, images: _variantImages, mainImageId: _variantMainImageId, ...variant }) => variant
    )
  });
  return withInventoryAlwaysTracked(parsed);
}

export const productZodSchemas = {
  adminListItem: productSelectSchema.extend({
    attributeTitles: z.string().optional(),
    categoryTitle: z.string().optional(),
    categoryTitles: z.string().optional(),
    collectionTitles: z.string().optional(),
    inventoryLevel: z.enum([PRODUCT_INVENTORY_LEVEL.OUT, PRODUCT_INVENTORY_LEVEL.LOW, PRODUCT_INVENTORY_LEVEL.OK]),
    minPrice: z.number().optional(),
    skuSummary: z.string().optional(),
    totalStock: z.number(),
    variantCount: z.number()
  }),
  catalogUpsertInput: catalogUpsertInputSchema,
  createCompleteInput: catalogUpsertInputSchema.extend({
    attributeValues: z.array(attributeOnProductZodSchemas.row),
    images: z.array(productImageReplaceRowSchema)
  }),
  createInput: catalogUpsertInputSchema,
  deleteInput: z.array(productIdSchema).min(PRODUCT_MIN_LENGTH),
  insert: productSelectSchema,
  reorderInput: z.array(productIdSchema).min(PRODUCT_MIN_LENGTH),
  select: productSelectSchema,
  stats: z.object({
    active: z.number(),
    archived: z.number(),
    draft: z.number(),
    lowStock: z.number(),
    total: z.number()
  }),
  update: catalogUpsertInputSchema.extend({
    id: productIdSchema
  }),
  updateCompleteInput: catalogUpsertInputSchema.extend({
    attributeValues: z.array(attributeOnProductZodSchemas.row),
    id: productIdSchema,
    images: z.array(productImageReplaceRowSchema),
    variantAttributeValues: z.array(
      z.object({
        values: z.array(attributeOnProductZodSchemas.row),
        variantId: z.string().trim().min(PRODUCT_MIN_LENGTH).max(PRODUCT_COLUMN_LENGTH.id)
      })
    )
  })
};
