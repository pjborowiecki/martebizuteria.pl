import { galleryImagesToReplacePayload } from "~/src/modules/product-image/product-image.utils"
import { type ProductFormValues } from "~/src/modules/product/product.zod"

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
