import { v7 as uuidv7 } from "uuid";

import { DEFAULT_LOCALE } from "~/src/constants/_constants/locales";

import { formatCentsToMoneyInput } from "~/src/lib/utils";

import { resolveMainImageId } from "~/src/components/custom/pages/admin/catalog/product-editor/product-image-form.utils";
import { ensureImplicitVariantOptions } from "~/src/components/custom/pages/admin/catalog/product-editor/product-variant-form.utils";

import { resolveAdditionalCategoryIds, resolvePrimaryCategoryId } from "~/src/modules/category-on-product/category-on-product.utils";
import { resolveCollectionIds } from "~/src/modules/collection-on-product/collection-on-product.utils";
import { createEmptyProductAttributeLocaleMap } from "~/src/modules/product-attribute/product-attribute.utils";
import { isProductLevelImage, type ProductImageFormRow } from "~/src/modules/product-image/product-image.utils";
import { coerceProductOptionValueLabels } from "~/src/modules/product-option-value/product-option-value.utils";
import {
  buildVariantCombinationKey,
  buildVariantCombinationsFromFormDrafts,
  buildVariantDisplayTitle,
  inferHasVariants,
  type ProductOptionDraft,
  type ProductOptionValueDraft
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
const EMPTY_LENGTH = 0;
const ZERO_QUANTITY = 0;
const FIRST_IMAGE_INDEX = 0;
const FIRST_OPTION_LINK_INDEX = 0;

type ProductDetailVariant = AdminProductDetail["variants"][number];

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

function mapVariantImages(images: readonly { readonly id: string; readonly url: string; readonly alt?: string | null }[]): {
  images: ProductImageFormRow[];
  mainImageId: string | undefined;
} {
  const mapped = images.map((image) => ({
    alt: image.alt ?? "",
    id: image.id,
    url: image.url
  }));

  return {
    images: mapped,
    mainImageId: mapped[FIRST_IMAGE_INDEX]?.id
  };
}

function resolveVariantImageRows(
  variant: ProductDetailVariant,
  productImages: AdminProductDetail["images"]
): readonly { readonly alt?: string | null; readonly id: string; readonly url: string }[] {
  const relationImages = variant.images ?? [];
  if (relationImages.length > EMPTY_LENGTH) {
    return relationImages;
  }

  return productImages.filter((image) => image.variantId === variant.id).toSorted((left, right) => left.rank - right.rank);
}

function buildFormOptionValues(option: ProductOptionDraft, value: ProductOptionValueDraft, index: number): Record<string, string> {
  const optionId = option.id ?? option.titles[DEFAULT_LOCALE];
  let valueId = value.id;
  if (valueId === undefined || valueId === "") {
    valueId = value.labels[DEFAULT_LOCALE] === "" ? `__draft_${index}` : value.labels[DEFAULT_LOCALE];
  }
  return { [optionId]: valueId };
}

interface VariantRowMapContext {
  readonly optionValues: Record<string, string>;
  readonly options: ProductOptionDraft[];
  readonly productImages: AdminProductDetail["images"];
}

function mapVariantRow(variant: ProductDetailVariant, context: VariantRowMapContext): ProductFormValues["variants"][number] {
  const { optionValues, options, productImages } = context;
  const media = mapVariantImages(resolveVariantImageRows(variant, productImages));

  return {
    attributeValues: (variant.attributes ?? []).map((row, index) => ({
      attributeId: row.attributeId,
      id: row.id,
      rank: row.rank ?? index,
      value: row.value
    })),
    compareAtPrice: variant.compareAtPrice === null ? "" : formatCentsToMoneyInput(variant.compareAtPrice),
    id: variant.id,
    images: media.images,
    mainImageId: media.mainImageId,
    manageInventory: true,
    optionValues,
    price: formatCentsToMoneyInput(variant.price),
    quantity: variant.inventory?.quantityAvailable ?? ZERO_QUANTITY,
    sku: variant.sku ?? "",
    title: buildVariantDisplayTitle(optionValues, options, DEFAULT_LOCALE)
  };
}

function mapOptions(product: AdminProductDetail): ProductFormValues["options"] {
  return product.options.map((option) => ({
    id: option.id,
    titles: coerceProductLocaleMap(option.titles),
    values: option.values.map((value) => ({
      id: value.id,
      labels: coerceProductOptionValueLabels(value.labels)
    }))
  }));
}

function findVariantByOptionValueId(productVariants: AdminProductDetail["variants"], valueId: string): ProductDetailVariant | undefined {
  return productVariants.find((variant) => variant.optionOnVariants?.some((row) => row.value.id === valueId));
}

function sortVariantsByOptionValueRank(
  productVariants: AdminProductDetail["variants"],
  options: readonly ProductOptionDraft[]
): AdminProductDetail["variants"] {
  const [option] = options;
  if (option === undefined) {
    return [...productVariants];
  }

  const valueRankById = new Map(option.values.map((value, index) => [value.id ?? "", index] as const));
  const maxRank = option.values.length;

  return [...productVariants].toSorted((left, right) => {
    const leftRank = valueRankById.get(left.optionOnVariants?.[FIRST_OPTION_LINK_INDEX]?.value.id ?? "") ?? maxRank;
    const rightRank = valueRankById.get(right.optionOnVariants?.[FIRST_OPTION_LINK_INDEX]?.value.id ?? "") ?? maxRank;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.title.localeCompare(right.title);
  });
}

function createEmptyVariantFormRow(
  option: ProductOptionDraft,
  value: ProductOptionValueDraft,
  index: number
): ProductFormValues["variants"][number] {
  const optionValues = buildFormOptionValues(option, value, index);

  return {
    attributeValues: [],
    compareAtPrice: "",
    id: uuidv7(),
    images: [],
    mainImageId: undefined,
    manageInventory: true,
    optionValues,
    price: "",
    quantity: ZERO_QUANTITY,
    sku: "",
    title: buildVariantDisplayTitle(optionValues, [option], DEFAULT_LOCALE)
  };
}

/** One form row per option value, matched to DB variant by value id then index. */
function mapVariantsToFormRows(
  productVariants: AdminProductDetail["variants"],
  options: ProductOptionDraft[],
  productImages: AdminProductDetail["images"]
): ProductFormValues["variants"] {
  const [option] = options;
  if (option === undefined) {
    return [];
  }

  const sortedVariants = sortVariantsByOptionValueRank(productVariants, options);

  return option.values.map((value, index) => {
    const optionValues = buildFormOptionValues(option, value, index);
    const dbVariant =
      (value.id !== undefined && value.id !== "" ? findVariantByOptionValueId(productVariants, value.id) : undefined) ??
      sortedVariants[index] ??
      productVariants.find((variant) => variant.title.trim() === value.labels[DEFAULT_LOCALE].trim());

    if (dbVariant === undefined) {
      return createEmptyVariantFormRow(option, value, index);
    }

    return mapVariantRow(dbVariant, { optionValues, options, productImages });
  });
}

function mapProductImages(product: AdminProductDetail): { images: ProductImageFormRow[]; mainImageId: string | undefined } {
  const sharedImages = product.images.filter((image) => isProductLevelImage(image.variantId));
  const sorted = [...sharedImages].toSorted((left, right) => left.rank - right.rank);
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
  const options = mapOptions(product);
  const hasVariants = inferHasVariants(product.options, product.variants.length);
  const formOptions = hasVariants ? ensureImplicitVariantOptions(options) : [];
  const [firstVariant] = product.variants;
  const media = mapProductImages(product);

  return {
    additionalCategoryIds: resolveAdditionalCategoryIds(product.categories),
    attributeValues: product.attributes
      .filter((row) => row.variantId === undefined || row.variantId === null)
      .map((row, index) => ({
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
    options: formOptions,
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
    variants: hasVariants ? mapVariantsToFormRows(product.variants, formOptions, product.images) : []
  };
}

type VariantFormRow = ProductFormValues["variants"][number];

/** Rebuild variant rows after add/remove variant names — preserves SKU/price/images by index. */
export function regenerateVariantRows(
  options: readonly ProductOptionDraft[],
  currentVariants: readonly VariantFormRow[]
): ProductFormValues["variants"] {
  const combinations = buildVariantCombinationsFromFormDrafts(options);

  return combinations.map((combination, index) => {
    const existing =
      currentVariants[index] ??
      currentVariants.find((row) => buildVariantCombinationKey(row.optionValues) === buildVariantCombinationKey(combination.optionValues));

    return {
      attributeValues: existing?.attributeValues ?? [],
      compareAtPrice: existing?.compareAtPrice ?? "",
      id: existing?.id ?? uuidv7(),
      images: existing?.images ?? [],
      mainImageId: existing?.mainImageId ?? existing?.images?.[FIRST_IMAGE_INDEX]?.id,
      manageInventory: true,
      optionValues: combination.optionValues,
      price: existing?.price ?? "",
      quantity: existing?.quantity ?? ZERO_QUANTITY,
      sku: existing?.sku ?? "",
      title: buildVariantDisplayTitle(combination.optionValues, options, DEFAULT_LOCALE)
    };
  });
}

export function toCatalogUpsertPayload(values: CatalogUpsertInput, productId: string) {
  return {
    ...values,
    id: productId
  };
}
