import { galleryImagesToReplacePayload } from "~/src/modules/product-image/product-image.utils";
import type { ProductFormValues } from "~/src/modules/product/product.zod";

const EMPTY_LENGTH = 0;

export function buildProductLevelAttributeRows(values: ProductFormValues) {
  if (values.hasVariants) {
    return [];
  }

  return values.attributeValues
    .filter((row) => row.attributeId.trim() !== "" && row.value.trim() !== "")
    .map((row, index) => ({
      attributeId: row.attributeId,
      id: row.id,
      rank: index,
      value: row.value.trim()
    }));
}

export function buildVariantAttributeGroups(values: ProductFormValues) {
  return values.variants
    .filter((variant): variant is typeof variant & { id: string } => variant.id !== undefined)
    .map((variant) => ({
      values: (variant.attributeValues ?? [])
        .filter((row) => row.attributeId.trim() !== "" && row.value.trim() !== "")
        .map((row, index) => ({
          attributeId: row.attributeId,
          id: row.id,
          rank: index,
          value: row.value.trim()
        })),
      variantId: variant.id
    }))
    .filter((group) => group.values.length > EMPTY_LENGTH);
}

export function buildAllProductImageRows(values: ProductFormValues) {
  const sharedImages = galleryImagesToReplacePayload(values.images, values.mainImageId);
  const variantImages = values.variants.flatMap((variant) => {
    if (variant.id === undefined) {
      return [];
    }

    return galleryImagesToReplacePayload(variant.images ?? [], variant.mainImageId, variant.id);
  });

  return [...sharedImages, ...variantImages];
}
