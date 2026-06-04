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
import type { productCategory } from "~/src/modules/product-category/product-category.schema";
import { resolveCategoryTitle } from "~/src/modules/product-category/product-category.utils";
import type { productCollection } from "~/src/modules/product-collection/product-collection.schema";
import { resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils";
import type { productOption } from "~/src/modules/product-option/product-option.schema";
import type { productVariant } from "~/src/modules/product-variant/product-variant.schema";
import {
  buildVariantCombinationKey,
  buildVariantCombinations,
  DEFAULT_VARIANT_TITLE,
  normalizeOptionDrafts,
  type ProductOptionDraft
} from "~/src/modules/product-variant/product-variant.utils";
import type { productAccessors } from "~/src/modules/product/product.accessors";
import {
  PRODUCT_ADMIN_STATUS,
  PRODUCT_INVENTORY_LEVEL,
  PRODUCT_LOW_STOCK_THRESHOLD,
  PRODUCT_STATUS,
  type ProductAdminStatus,
  type ProductInventoryLevel,
  type ProductStatus
} from "~/src/modules/product/product.constants";
import type { Product, ProductLocaleMap, ProductTagsLocaleMap, StorefrontProduct } from "~/src/modules/product/product.types";
import type { productZodSchemas } from "~/src/modules/product/product.zod";

const ZERO_STOCK = 0;
const ZERO_COUNT = 0;
const EMPTY_LENGTH = 0;
const EMPTY_SKU = "";
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
  readonly variantRows: (typeof productVariant.$inferInsert)[];
}

export interface ProductOrganizationReplacePayload {
  readonly categoryRows: (typeof categoryOnProduct.$inferInsert)[];
  readonly collectionRows: (typeof collectionOnProduct.$inferInsert)[];
}

export type AdminProductListRow = Awaited<ReturnType<(typeof productAccessors.getAdminProductsQuery)["execute"]>>[number];

export type AdminProductDetail = NonNullable<Awaited<ReturnType<(typeof productAccessors.getProductByHandleQuery)["execute"]>>>;

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

export function toAdminProductListItem(
  row: AdminProductListRow,
  statsByProductId: Map<string, { minPrice: number | undefined; totalStock: number; variantCount: number }>
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
    attributeTitles: attributeRows
      .map((entry) => resolveProductAttributeTitle(entry.productAttribute.titles, DEFAULT_LOCALE))
      .filter((title) => title !== "")
      .join(", "),
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
    subtitles: coerceProductLocaleMap(productRow.subtitles),
    tags: coerceProductTagsLocaleMap(productRow.tags),
    titles: coerceProductLocaleMap(productRow.titles),
    totalStock,
    variantCount
  };
}

export function countLowStockPublishedProducts(publishedProductIds: readonly string[], stats: readonly ProductVariantStatsRow[]): number {
  const stockByProductId = new Map(stats.map((entry) => [entry.productId, entry.totalStock]));

  return publishedProductIds.filter((id) => {
    const stock = stockByProductId.get(id) ?? ZERO_COUNT;
    return stock > ZERO_COUNT && stock <= PRODUCT_LOW_STOCK_THRESHOLD;
  }).length;
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

export function mapPublishedProductForStorefront(
  productRow: {
    readonly attributes: readonly {
      readonly productAttribute: {
        readonly allowedValues: readonly ProductAttributeAllowedValue[] | null;
        readonly handle: string;
        readonly titles: ProductAttributeLocaleMap;
        readonly type: ProductAttributeType;
        readonly unit: string | null;
      };
      readonly rank: number;
      readonly value: string;
    }[];
    readonly categories: readonly {
      readonly productCategory: typeof productCategory.$inferSelect;
      readonly categoryId: string;
      readonly isPrimary: boolean;
    }[];
    readonly collections: readonly { readonly productCollection: typeof productCollection.$inferSelect; readonly collectionId: string }[];
    readonly createdAt: Date;
    readonly descriptions: ProductLocaleMap | null;
    readonly handle: string;
    readonly id: string;
    readonly images: readonly { readonly url: string }[];
    readonly metadata: Record<string, never> | null;
    readonly status: ProductStatus;
    readonly subtitles: ProductLocaleMap | null;
    readonly tags: ProductTagsLocaleMap | null;
    readonly thumbnail: string | null;
    readonly titles: ProductLocaleMap;
    readonly updatedAt: Date;
    readonly variants: StorefrontProduct["variants"];
    readonly primaryCategoryId: string | null;
    readonly rank: number;
  },
  locale: string = DEFAULT_LOCALE
): StorefrontProduct {
  const { attributes, categories: categoryRows, collections: collectionRows, images: imageRows } = productRow;
  const resolvedPrimaryCategoryId = productRow.primaryCategoryId ?? resolvePrimaryCategoryId(categoryRows);
  const primaryCategory = categoryRows.find((entry) => entry.categoryId === resolvedPrimaryCategoryId)?.productCategory;
  const [firstCollection] = collectionRows;
  const resolvedDescription = resolveProductDescription(productRow.descriptions, locale);
  const resolvedSubtitle = resolveProductSubtitle(productRow.subtitles, locale);
  const resolvedTags = resolveProductTags(productRow.tags, locale);

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
    id: productRow.id,
    imageUrls: imageRows.map((image) => image.url),
    metadata: productRow.metadata,
    primaryCategoryId: resolvedPrimaryCategoryId ?? productRow.primaryCategoryId,
    rank: productRow.rank,
    specifications: attributes.map((entry) => ({
      allowedValues: entry.productAttribute.allowedValues,
      handle: entry.productAttribute.handle,
      rank: entry.rank,
      titles: entry.productAttribute.titles,
      type: entry.productAttribute.type,
      unit: entry.productAttribute.unit,
      value: entry.value
    })),
    status: productRow.status,
    subtitle: resolvedSubtitle,
    tags: resolvedTags.length > EMPTY_LENGTH ? resolvedTags : undefined,
    thumbnail: productRow.thumbnail,
    title: resolveProductTitle(productRow.titles, locale),
    updatedAt: productRow.updatedAt,
    variants: productRow.variants
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
  variants: readonly VariantRowInput[]
): ProductVariantPersistRow[] {
  const variantsByKey = new Map(variants.map((row) => [buildVariantCombinationKey(row.optionValues), row] as const));

  return combinations.map((combination) => {
    const key = buildVariantCombinationKey(combination.optionValues);
    const existing = variantsByKey.get(key);

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
  return mergeVariantRows(combinations, variants);
}

function buildVariantPersistRows(input: CatalogUpsertInput): ProductVariantPersistRow[] {
  if (input.hasVariants) {
    return buildMultiVariantRows(input.options, input.variants);
  }

  return buildSimpleVariantRows(input.simpleVariant ?? { compareAtPrice: "", manageInventory: true, price: "", quantity: 0, sku: "" });
}

export function prepareCatalogReplacePayload(productId: string, input: CatalogUpsertInput): ProductCatalogReplacePayload {
  const variantPersistRows = buildVariantPersistRows(input);
  const normalizedOptions = input.hasVariants ? normalizeOptionDrafts(input.options) : [];

  const optionRows = normalizedOptions.map((option) => ({
    id: option.id ?? uuidv7(),
    productId,
    title: option.title
  }));

  const optionIdByTitle = new Map(optionRows.map((row) => [row.title, row.id] as const));

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
    Object.entries(variantRow.optionValues).flatMap(([optionTitle, value]) => {
      const optionId = optionIdByTitle.get(optionTitle);
      if (optionId === undefined) {
        return [];
      }

      return [
        {
          id: uuidv7(),
          optionId,
          value,
          variantId: variantRow.id
        }
      ];
    })
  );

  return { inventoryRows, optionOnVariantRows, optionRows, variantRows };
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
