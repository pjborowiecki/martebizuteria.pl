import { formatCentsToMoneyInput } from "~/src/lib/utils";

import {
  resolveMainImageId,
  type ProductImageFormRow
} from "~/src/components/custom/pages/admin/catalog/product-editor/product-image-form.utils";

import { resolveAdditionalCategoryIds, resolvePrimaryCategoryId } from "~/src/modules/category-on-product/category-on-product.utils";
import { resolveCollectionIds } from "~/src/modules/collection-on-product/collection-on-product.utils";
import { createEmptyProductAttributeLocaleMap } from "~/src/modules/product-attribute/product-attribute.utils";
import {
  buildVariantCombinationKey,
  buildVariantCombinations,
  inferHasVariants,
  normalizeOptionDrafts,
  type ProductOptionDraft
} from "~/src/modules/product-variant/product-variant.utils";
import { PRODUCT_ADMIN_STATUS, PRODUCT_STATUSES, type ProductStatus } from "~/src/modules/product/product.constants";
import {
  coerceProductLocaleMap,
  coerceProductTagsLocaleMap,
  createEmptyProductTagsLocaleMap,
  toProductAdminStatus,
  type AdminProductDetail
} from "~/src/modules/product/product.utils";
import type { CatalogUpsertInput, ProductFormValues } from "~/src/modules/product/product.zod";

export type { AdminProductDetail, ProductFormValues };

function isProductStatus(value: string): value is ProductStatus {
  return (PRODUCT_STATUSES as readonly string[]).includes(value);
}

const EMPTY_TAGS = createEmptyProductTagsLocaleMap();
const ZERO_QUANTITY = 0;

export function createEmptyProductFormValues(): ProductFormValues {
  return {
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
      sku: ""
    },
    status: PRODUCT_ADMIN_STATUS.DRAFT,
    subtitles: createEmptyProductAttributeLocaleMap(),
    tags: createEmptyProductTagsLocaleMap(),
    titles: createEmptyProductAttributeLocaleMap(),
    variants: []
  };
}

function mapVariantRow(variant: AdminProductDetail["variants"][number]): ProductFormValues["variants"][number] {
  const optionValues = Object.fromEntries(variant.optionOnVariants.map((row) => [row.option.title, row.value]));

  return {
    compareAtPrice: variant.compareAtPrice === null ? "" : formatCentsToMoneyInput(variant.compareAtPrice),
    id: variant.id,
    manageInventory: true,
    optionValues,
    price: formatCentsToMoneyInput(variant.price),
    quantity: variant.inventory?.quantityAvailable ?? ZERO_QUANTITY,
    sku: variant.sku ?? "",
    title: variant.title
  };
}

function mapOptions(product: AdminProductDetail): ProductFormValues["options"] {
  return product.options.map((option) => ({
    id: option.id,
    title: option.title,
    values: [...new Set(option.optionOnVariants.map((row) => row.value))]
  }));
}

function mapProductImages(product: AdminProductDetail): { images: ProductImageFormRow[]; mainImageId: string | undefined } {
  const sorted = [...product.images].toSorted((left, right) => left.rank - right.rank);
  const images = sorted.map((image) => ({
    alt: image.alt ?? "",
    id: image.id,
    url: image.url
  }));

  return {
    images,
    mainImageId: resolveMainImageId(images, product.thumbnail)
  };
}

export function mapProductDetailToFormValues(product: AdminProductDetail): ProductFormValues {
  const hasVariants = inferHasVariants(product.options, product.variants.length);
  const [firstVariant] = product.variants;
  const media = mapProductImages(product);

  return {
    additionalCategoryIds: resolveAdditionalCategoryIds(product.categories),
    attributeValues: product.attributes.map((row, index) => ({
      attributeId: row.attributeId,
      id: row.id,
      rank: row.rank ?? index,
      value: row.value
    })),
    collectionIds: resolveCollectionIds(product.collections),
    descriptions: coerceProductLocaleMap(product.descriptions),
    handle: product.handle,
    hasVariants,
    images: media.images,
    mainImageId: media.mainImageId,
    options: hasVariants ? mapOptions(product) : [],
    primaryCategoryId: resolvePrimaryCategoryId(product.categories) ?? "",
    simpleVariant:
      firstVariant === undefined
        ? createEmptyProductFormValues().simpleVariant
        : {
            compareAtPrice: firstVariant.compareAtPrice === null ? "" : formatCentsToMoneyInput(firstVariant.compareAtPrice),
            manageInventory: firstVariant.manageInventory,
            price: formatCentsToMoneyInput(firstVariant.price),
            quantity: firstVariant.inventory?.quantityAvailable ?? ZERO_QUANTITY,
            sku: firstVariant.sku ?? ""
          },
    status: isProductStatus(product.status) ? toProductAdminStatus(product.status) : PRODUCT_ADMIN_STATUS.DRAFT,
    subtitles: coerceProductLocaleMap(product.subtitles),
    tags: coerceProductTagsLocaleMap(product.tags ?? EMPTY_TAGS),
    titles: coerceProductLocaleMap(product.titles),
    variants: hasVariants ? product.variants.map(mapVariantRow) : []
  };
}

type VariantFormRow = ProductFormValues["variants"][number];

export function regenerateVariantRows(
  options: readonly ProductOptionDraft[],
  currentVariants: readonly VariantFormRow[]
): ProductFormValues["variants"] {
  const normalized = normalizeOptionDrafts(options);
  const combinations = buildVariantCombinations(normalized);
  const variantsByKey = new Map(currentVariants.map((row) => [buildVariantCombinationKey(row.optionValues), row] as const));

  return combinations.map((combination) => {
    const key = buildVariantCombinationKey(combination.optionValues);
    const existing = variantsByKey.get(key);

    return {
      compareAtPrice: existing?.compareAtPrice ?? "",
      id: existing?.id,
      manageInventory: true,
      optionValues: combination.optionValues,
      price: existing?.price ?? "",
      quantity: existing?.quantity ?? ZERO_QUANTITY,
      sku: existing?.sku ?? "",
      title: combination.title
    };
  });
}

export function toCatalogUpsertPayload(values: CatalogUpsertInput, productId: string) {
  return {
    ...values,
    id: productId
  };
}
