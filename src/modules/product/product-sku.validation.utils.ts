import { type CatalogUpsertInput, type ProductFormValues } from "~/src/modules/product/product.zod"

const EMPTY_SKU = ""

const VARIANT_SKU_PATH_REGEX = /^variants\.(?<variantIndex>\d+)\.sku$/u

export type ProductSkuFormFieldPath = "simpleVariant.sku" | `variants.${number}.sku`

export interface ProductFormSkuEntry {
  readonly formPath: ProductSkuFormFieldPath
  readonly sku: string
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
