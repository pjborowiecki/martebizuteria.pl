import { v7 as uuidv7 } from "uuid";
import type { z } from "zod/v4";

import { STORE_CURRENCY_CODE } from "~/src/constants/_constants/currency";
import { DEFAULT_LOCALE, LOCALES } from "~/src/constants/_constants/locales";

import { parseMoneyInputToMinorUnits } from "~/src/lib/_utils/currency";

import type { categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema";
import { buildCategoryOnProductRows, resolvePrimaryCategoryId } from "~/src/modules/category-on-product/category-on-product.utils";
import type { collectionOnProduct } from "~/src/modules/collection-on-product/collection-on-product.schema";
import { buildCollectionOnProductRows } from "~/src/modules/collection-on-product/collection-on-product.utils";
import type { inventory } from "~/src/modules/inventory/inventory.schema";
import type { optionOnVariant } from "~/src/modules/option-on-variant/option-on-variant.schema";
import type { ProductAttributeType } from "~/src/modules/product-attribute/product-attribute.constants";
import type { ProductAttributeAllowedValue, ProductAttributeLocaleMap } from "~/src/modules/product-attribute/product-attribute.types";
import {
  coerceProductAttributeLocaleMap,
  createEmptyProductAttributeLocaleMap,
  normalizeProductAttributeLocaleMapForSave,
  resolveLocalizedString,
  resolveProductAttributeTitle
} from "~/src/modules/product-attribute/product-attribute.utils";
import { resolveCategoryTitle } from "~/src/modules/product-category/product-category.utils";
import { resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils";
import { isProductLevelImage } from "~/src/modules/product-image/product-image.utils";
import type { productOptionValue } from "~/src/modules/product-option-value/product-option-value.schema";
import {
  normalizeProductOptionValueLabelsForSave,
  resolveProductOptionTitle,
  resolveProductOptionValueLabel
} from "~/src/modules/product-option-value/product-option-value.utils";
import type { productOption } from "~/src/modules/product-option/product-option.schema";
import type { productVariant } from "~/src/modules/product-variant/product-variant.schema";
import {
  buildVariantCombinationKey,
  buildVariantCombinations,
  buildVariantDisplayTitle,
  DEFAULT_VARIANT_TITLE,
  inferHasVariants,
  normalizeOptionDrafts,
  resolveVariantOptionValueIds,
  type ProductOptionDraft
} from "~/src/modules/product-variant/product-variant.utils";
import type { productAccessors } from "~/src/modules/product/product.accessors";
import {
  PRODUCT_ADMIN_STATUS,
  PRODUCT_INVENTORY_LEVEL,
  PRODUCT_LOW_STOCK_THRESHOLD,
  PRODUCT_MULTI_VARIANT_COUNT_THRESHOLD,
  PRODUCT_STATUS,
  PRODUCT_VARIANT_KIND,
  type ProductAdminStatus,
  type ProductInventoryLevel,
  type ProductStatus,
  type ProductVariantKind
} from "~/src/modules/product/product.constants";
import type {
  Product,
  ProductLocaleMap,
  ProductSpecification,
  ProductTagsLocaleMap,
  StorefrontProduct,
  StorefrontProductOption
} from "~/src/modules/product/product.types";
import type { productZodSchemas } from "~/src/modules/product/product.zod";

const ZERO_STOCK = 0;
const ZERO_COUNT = 0;
const EMPTY_LENGTH = 0;
const EMPTY_SKU = "";
const FIRST_VARIANT_INDEX = 0;
const MANAGE_INVENTORY_ALWAYS = true;

type CatalogUpsertInput = z.infer<(typeof productZodSchemas)["catalogUpsertInput"]>;
type VariantRowInput = CatalogUpsertInput["variants"][number];
type SimpleVariantInput = NonNullable<CatalogUpsertInput["simpleVariant"]>;

export interface ProductVariantPersistRow {
  readonly compareAtPrice: number | undefined;
  readonly id: string;
  readonly manageInventory: boolean;
  readonly optionValues: Readonly<Record<string, string>>;
  readonly price: number;
  readonly quantity: number;
  readonly sku: string | undefined;
  readonly title: string;
}

export interface ProductCatalogReplacePayload {
  readonly inventoryRows: (typeof inventory.$inferInsert)[];
  readonly optionOnVariantRows: (typeof optionOnVariant.$inferInsert)[];
  readonly optionRows: (typeof productOption.$inferInsert)[];
  readonly optionValueRows: (typeof productOptionValue.$inferInsert)[];
  readonly variantRows: (typeof productVariant.$inferInsert)[];
}

export interface ProductOrganizationReplacePayload {
  readonly categoryRows: (typeof categoryOnProduct.$inferInsert)[];
  readonly collectionRows: (typeof collectionOnProduct.$inferInsert)[];
}

export type AdminProductListRow = Awaited<ReturnType<typeof productAccessors.getAdminProductsCatalogList>>[number];

export type AdminProductDetail = NonNullable<Awaited<ReturnType<(typeof productAccessors.getProductByHandleQuery)["execute"]>>>;

export type PublishedProductByHandleRow = NonNullable<
  Awaited<ReturnType<(typeof productAccessors.getPublishedProductByHandleQuery)["execute"]>>
>;

export type ProductVariantStatsRow = Awaited<ReturnType<(typeof productAccessors.getProductVariantStatsQuery)["execute"]>>[number];

export function coerceProductLocaleMap(value: unknown): ProductLocaleMap {
  if (typeof value === "string") {
    return coerceProductAttributeLocaleMap({ [DEFAULT_LOCALE]: value });
  }

  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) {
    return createEmptyProductAttributeLocaleMap();
  }

  return coerceProductAttributeLocaleMap(value as Partial<ProductLocaleMap>);
}

export function normalizeOptionalProductLocaleMapForSave(map: ProductLocaleMap): ProductLocaleMap | undefined {
  const normalized = normalizeProductAttributeLocaleMapForSave(map);
  if (LOCALES.every((locale) => normalized[locale] === "")) {
    return undefined;
  }
  return normalized;
}

export function resolveProductTitle(titles: unknown, locale: string): string {
  return resolveLocalizedString(coerceProductLocaleMap(titles), locale);
}

export function resolveProductSubtitle(subtitles: unknown, locale: string): string {
  return resolveLocalizedString(coerceProductLocaleMap(subtitles), locale);
}

export function resolveProductDescription(descriptions: unknown, locale: string): string {
  return resolveLocalizedString(coerceProductLocaleMap(descriptions), locale);
}

export function createEmptyProductTagsLocaleMap(): ProductTagsLocaleMap {
  return Object.fromEntries(LOCALES.map((locale) => [locale, [] as string[]])) as ProductTagsLocaleMap;
}

export function coerceProductTagsLocaleMap(value: unknown): ProductTagsLocaleMap {
  if (Array.isArray(value)) {
    return { ...createEmptyProductTagsLocaleMap(), [DEFAULT_LOCALE]: value.filter((entry): entry is string => typeof entry === "string") };
  }

  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) {
    return createEmptyProductTagsLocaleMap();
  }

  const record = value as Partial<Record<string, unknown>>;
  return Object.fromEntries(
    LOCALES.map((locale) => {
      const tags = record[locale];
      if (!Array.isArray(tags)) {
        return [locale, [] as string[]];
      }
      return [locale, tags.filter((entry): entry is string => typeof entry === "string")];
    })
  ) as ProductTagsLocaleMap;
}

export function normalizeProductTagsLocaleMapForSave(map: ProductTagsLocaleMap): ProductTagsLocaleMap | undefined {
  const normalized = Object.fromEntries(
    LOCALES.map((locale) => [locale, map[locale].map((tag) => tag.trim()).filter((tag) => tag !== "")])
  ) as ProductTagsLocaleMap;

  if (LOCALES.every((locale) => normalized[locale].length === EMPTY_LENGTH)) {
    return undefined;
  }

  return normalized;
}

export function resolveProductTags(tags: unknown, locale: string): string[] {
  const map = coerceProductTagsLocaleMap(tags);
  if (locale === "pl" || locale === "en") {
    return map[locale];
  }

  return map[DEFAULT_LOCALE];
}

export type ProductVariantSkuRow = Awaited<ReturnType<(typeof productAccessors.getProductVariantSkuRowsQuery)["execute"]>>[number];

export function buildVariantStatsByProductId(stats: readonly ProductVariantStatsRow[]) {
  return new Map(
    stats.map((entry) => [
      entry.productId,
      {
        minPrice: entry.minPrice ?? undefined,
        totalStock: entry.totalStock,
        variantCount: entry.variantCount
      }
    ])
  );
}

export function buildSkuSummaryByProductId(rows: readonly ProductVariantSkuRow[]): Map<string, string> {
  const skusByProductId = new Map<string, string[]>();

  for (const row of rows) {
    const sku = row.sku?.trim() ?? "";
    if (sku !== "") {
      const existing = skusByProductId.get(row.productId) ?? [];
      if (!existing.includes(sku)) {
        existing.push(sku);
      }

      skusByProductId.set(row.productId, existing);
    }
  }

  return new Map([...skusByProductId.entries()].map(([productId, skus]) => [productId, skus.join(", ")]));
}

export function resolveProductVariantKind(variantCount: number): ProductVariantKind {
  return variantCount > PRODUCT_MULTI_VARIANT_COUNT_THRESHOLD ? PRODUCT_VARIANT_KIND.MULTI : PRODUCT_VARIANT_KIND.SINGLE;
}

function formatUniqueProductAttributeTitles(
  attributeRows: readonly { readonly attributeId: string; readonly productAttribute: { readonly titles: ProductAttributeLocaleMap } }[]
): string {
  const seenAttributeIds = new Set<string>();

  return attributeRows
    .filter((entry) => {
      if (seenAttributeIds.has(entry.attributeId)) {
        return false;
      }

      seenAttributeIds.add(entry.attributeId);
      return true;
    })
    .map((entry) => resolveProductAttributeTitle(entry.productAttribute.titles, DEFAULT_LOCALE))
    .filter((title) => title !== "")
    .join(", ");
}

export function toAdminProductListItem(
  row: AdminProductListRow,
  statsByProductId: Map<string, { minPrice: number | undefined; totalStock: number; variantCount: number }>,
  skuSummaryByProductId?: ReadonlyMap<string, string>
): Product["adminListItem"] {
  const { attributes: attributeRows, categories: categoryRows, collections: collectionRows, ...productRow } = row;
  const stats = statsByProductId.get(row.id);
  const variantCount = stats?.variantCount ?? ZERO_COUNT;
  const totalStock = stats?.totalStock ?? ZERO_COUNT;
  const minPrice = stats?.minPrice ?? undefined;
  const primaryCategoryRow =
    categoryRows.find((entry) => entry.isPrimary) ??
    categoryRows.find((entry) => entry.categoryId === productRow.primaryCategoryId) ??
    categoryRows[EMPTY_LENGTH];

  return {
    ...productRow,
    attributeTitles: formatUniqueProductAttributeTitles(attributeRows),
    categoryTitle:
      primaryCategoryRow === undefined
        ? undefined
        : resolveCategoryTitle(primaryCategoryRow.productCategory.titles, DEFAULT_LOCALE) || undefined,
    categoryTitles: categoryRows
      .map((entry) => resolveCategoryTitle(entry.productCategory.titles, DEFAULT_LOCALE))
      .filter((title) => title !== "")
      .join(", "),
    collectionTitles: collectionRows
      .map((entry) => resolveCollectionTitle(entry.productCollection.titles, DEFAULT_LOCALE))
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
    variantCount
  };
}

export function toProductDbStatus(status: ProductAdminStatus): ProductStatus {
  if (status === PRODUCT_ADMIN_STATUS.ACTIVE) {
    return PRODUCT_STATUS.PUBLISHED;
  }

  if (status === PRODUCT_ADMIN_STATUS.ARCHIVED) {
    return PRODUCT_STATUS.ARCHIVED;
  }

  return PRODUCT_STATUS.DRAFT;
}

export function toProductAdminStatus(status: ProductStatus): ProductAdminStatus {
  if (status === PRODUCT_STATUS.PUBLISHED) {
    return PRODUCT_ADMIN_STATUS.ACTIVE;
  }

  if (status === PRODUCT_STATUS.ARCHIVED) {
    return PRODUCT_ADMIN_STATUS.ARCHIVED;
  }

  return PRODUCT_ADMIN_STATUS.DRAFT;
}

export function resolveProductInventoryLevel(status: ProductStatus, totalStock: number): ProductInventoryLevel {
  if (status !== PRODUCT_STATUS.PUBLISHED) {
    return PRODUCT_INVENTORY_LEVEL.OK;
  }

  if (totalStock <= ZERO_STOCK) {
    return PRODUCT_INVENTORY_LEVEL.OUT;
  }

  if (totalStock <= PRODUCT_LOW_STOCK_THRESHOLD) {
    return PRODUCT_INVENTORY_LEVEL.LOW;
  }

  return PRODUCT_INVENTORY_LEVEL.OK;
}

function mapAttributeRowsToSpecifications(
  attributes: readonly {
    readonly productAttribute: {
      readonly allowedValues: readonly ProductAttributeAllowedValue[] | null;
      readonly handle: string;
      readonly titles: ProductAttributeLocaleMap;
      readonly type: ProductAttributeType;
      readonly unit: string | null;
    };
    readonly rank: number;
    readonly value: string;
  }[]
): ProductSpecification[] {
  return attributes.map((entry) => ({
    allowedValues: entry.productAttribute.allowedValues,
    handle: entry.productAttribute.handle,
    rank: entry.rank,
    titles: entry.productAttribute.titles,
    type: entry.productAttribute.type,
    unit: entry.productAttribute.unit,
    value: entry.value
  }));
}

export function mapPublishedProductForStorefront(
  productRow: PublishedProductByHandleRow,
  locale: string = DEFAULT_LOCALE
): StorefrontProduct {
  const { attributes, categories: categoryRows, collections: collectionRows, images: imageRows, options } = productRow;
  const resolvedPrimaryCategoryId = productRow.primaryCategoryId ?? resolvePrimaryCategoryId(categoryRows);
  const primaryCategory = categoryRows.find((entry) => entry.categoryId === resolvedPrimaryCategoryId)?.productCategory;
  const [firstCollection] = collectionRows;
  const resolvedDescription = resolveProductDescription(productRow.descriptions, locale);
  const resolvedSubtitle = resolveProductSubtitle(productRow.subtitles, locale);
  const resolvedTags = resolveProductTags(productRow.tags, locale);

  const sharedImageUrls = imageRows.filter((image) => isProductLevelImage(image.variantId)).map((image) => image.url);
  const productLevelAttributes = attributes.filter((entry) => entry.variantId === undefined || entry.variantId === null);
  const sharedSpecifications = mapAttributeRowsToSpecifications(productLevelAttributes);

  const storefrontOptions: StorefrontProductOption[] = options.map((option) => ({
    id: option.id,
    title: resolveProductOptionTitle(option.titles, locale),
    values: option.values.map((value) => ({
      id: value.id,
      label: resolveProductOptionValueLabel(value.labels, locale)
    }))
  }));

  const hasVariants = inferHasVariants(options, productRow.variants.length);

  const variants = productRow.variants.map((variant) => {
    const variantImages = variant.images ?? [];
    const variantImageUrls = variantImages.map((image) => image.url);
    const fallbackImages = variantImageUrls.length > EMPTY_LENGTH ? variantImageUrls : sharedImageUrls;
    const variantAttributes = variant.attributes ?? [];
    const variantSpecifications = mapAttributeRowsToSpecifications(variantAttributes);
    const specifications = variantSpecifications.length > EMPTY_LENGTH ? variantSpecifications : sharedSpecifications;

    return {
      ...variant,
      imageUrls: fallbackImages,
      optionValueIds:
        variant.optionOnVariants === undefined ? {} : resolveVariantOptionValueIds({ optionOnVariants: variant.optionOnVariants }),
      specifications
    };
  });

  const firstVariantImages = variants[FIRST_VARIANT_INDEX]?.imageUrls ?? [];
  let primaryImageUrls = imageRows.map((image) => image.url);
  if (firstVariantImages.length > EMPTY_LENGTH) {
    primaryImageUrls = [...firstVariantImages];
  } else if (sharedImageUrls.length > EMPTY_LENGTH) {
    primaryImageUrls = [...sharedImageUrls];
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
    tags: resolvedTags.length > EMPTY_LENGTH ? resolvedTags : undefined,
    thumbnail: productRow.thumbnail,
    title: resolveProductTitle(productRow.titles, locale),
    updatedAt: productRow.updatedAt,
    variants
  };
}

function normalizeSku(sku: string | undefined): string | undefined {
  const trimmed = sku?.trim();
  if (trimmed === undefined || trimmed === EMPTY_SKU) {
    return undefined;
  }

  return trimmed;
}

function requireMoneyMinorUnits(input: string): number {
  const minor = parseMoneyInputToMinorUnits(input, STORE_CURRENCY_CODE);
  if (minor === undefined) {
    throw new Error("Invalid money input");
  }

  return minor;
}

function buildSimpleVariantRows(simple: SimpleVariantInput): ProductVariantPersistRow[] {
  return [
    {
      compareAtPrice: simple.compareAtPrice === "" ? undefined : requireMoneyMinorUnits(simple.compareAtPrice),
      id: uuidv7(),
      manageInventory: MANAGE_INVENTORY_ALWAYS,
      optionValues: {},
      price: requireMoneyMinorUnits(simple.price),
      quantity: simple.quantity,
      sku: normalizeSku(simple.sku),
      title: DEFAULT_VARIANT_TITLE
    }
  ];
}

function mergeVariantRows(
  combinations: ReturnType<typeof buildVariantCombinations>,
  variants: readonly VariantRowInput[],
  options: readonly ProductOptionDraft[]
): ProductVariantPersistRow[] {
  const variantsByKey = new Map(variants.map((row) => [buildVariantCombinationKey(row.optionValues), row] as const));
  const variantsByTitle = new Map(variants.map((row) => [(row.title ?? "").trim(), row] as const));

  return combinations.map((combination, combinationIndex) => {
    const key = buildVariantCombinationKey(combination.optionValues);
    const existing =
      variantsByKey.get(key) ??
      variantsByTitle.get(buildVariantDisplayTitle(combination.optionValues, options, DEFAULT_LOCALE)) ??
      variantsByTitle.get(combination.title) ??
      variants[combinationIndex];

    return {
      compareAtPrice:
        existing?.compareAtPrice === undefined || existing.compareAtPrice === ""
          ? undefined
          : requireMoneyMinorUnits(existing.compareAtPrice),
      id: existing?.id ?? uuidv7(),
      manageInventory: MANAGE_INVENTORY_ALWAYS,
      optionValues: combination.optionValues,
      price: requireMoneyMinorUnits(existing?.price ?? ""),
      quantity: existing?.quantity ?? ZERO_COUNT,
      sku: normalizeSku(existing?.sku),
      title: existing?.title?.trim() === "" ? combination.title : (existing?.title ?? combination.title)
    };
  });
}

function buildMultiVariantRows(options: readonly ProductOptionDraft[], variants: readonly VariantRowInput[]): ProductVariantPersistRow[] {
  const normalizedOptions = normalizeOptionDrafts(options);
  const combinations = buildVariantCombinations(normalizedOptions);
  return mergeVariantRows(combinations, variants, options);
}

function buildVariantPersistRows(input: CatalogUpsertInput): ProductVariantPersistRow[] {
  if (input.hasVariants) {
    return buildMultiVariantRows(input.options, input.variants);
  }

  return buildSimpleVariantRows(input.simpleVariant ?? { compareAtPrice: "", manageInventory: true, price: "", quantity: 0, sku: "" });
}

function buildOptionValueIdLookup(
  normalizedOptions: readonly ProductOptionDraft[],
  optionRows: readonly { id: string }[],
  optionValueRows: readonly { id: string; optionId: string; rank: number }[]
): Map<string, string> {
  const valueIdByOptionAndKey = new Map<string, string>();

  normalizedOptions.forEach((option, optionIndex) => {
    const optionId = optionRows[optionIndex]?.id;
    if (optionId === undefined) {
      return;
    }

    option.values.forEach((value, valueIndex) => {
      const valueId = optionValueRows.find((row) => row.optionId === optionId && row.rank === valueIndex)?.id;
      if (valueId === undefined) {
        return;
      }

      const labelKey = LOCALES.map((locale) => value.labels[locale].trim()).join("|");
      valueIdByOptionAndKey.set(`${optionId}|${labelKey}`, valueId);
      if (value.id !== undefined) {
        valueIdByOptionAndKey.set(`${optionId}|${value.id}`, valueId);
      }
    });
  });

  return valueIdByOptionAndKey;
}

export function prepareCatalogReplacePayload(productId: string, input: CatalogUpsertInput): ProductCatalogReplacePayload {
  const variantPersistRows = buildVariantPersistRows(input);
  const normalizedOptions = input.hasVariants ? normalizeOptionDrafts(input.options) : [];

  const optionRows = normalizedOptions.map((option) => ({
    id: option.id ?? uuidv7(),
    productId,
    titles: normalizeProductAttributeLocaleMapForSave(option.titles)
  }));

  const optionValueRows = normalizedOptions.flatMap((option, optionIndex) => {
    const optionId = optionRows[optionIndex]?.id;
    if (optionId === undefined) {
      return [];
    }

    return option.values.map((value, valueIndex) => ({
      id: value.id ?? uuidv7(),
      labels: normalizeProductOptionValueLabelsForSave(value.labels),
      optionId,
      rank: valueIndex
    }));
  });

  const valueIdByOptionAndKey = buildOptionValueIdLookup(normalizedOptions, optionRows, optionValueRows);

  const variantRows = variantPersistRows.map((variantRow) => ({
    compareAtPrice: variantRow.compareAtPrice,
    id: variantRow.id,
    manageInventory: variantRow.manageInventory,
    price: variantRow.price,
    productId,
    sku: variantRow.sku,
    title: variantRow.title
  }));

  const inventoryRows = variantPersistRows.map((variantRow) => ({
    id: uuidv7(),
    quantityAvailable: variantRow.quantity,
    quantityReserved: ZERO_COUNT,
    variantId: variantRow.id,
    version: 1
  }));

  const optionOnVariantRows = variantPersistRows.flatMap((variantRow) =>
    Object.entries(variantRow.optionValues).flatMap(([optionId, valueKey]) => {
      const valueId = valueIdByOptionAndKey.get(`${optionId}|${valueKey}`);
      if (valueId === undefined) {
        return [];
      }

      return [
        {
          id: uuidv7(),
          optionId,
          valueId,
          variantId: variantRow.id
        }
      ];
    })
  );

  return { inventoryRows, optionOnVariantRows, optionRows, optionValueRows, variantRows };
}

export function prepareOrganizationReplacePayload(
  productId: string,
  input: CatalogUpsertInput
): ProductOrganizationReplacePayload | undefined {
  if (input.primaryCategoryId === "") {
    return undefined;
  }

  return {
    categoryRows: buildCategoryOnProductRows(productId, input.primaryCategoryId, input.additionalCategoryIds),
    collectionRows: buildCollectionOnProductRows(productId, input.collectionIds)
  };
}
