import { type ChangeEvent, useCallback } from "react"

import { type Control, useController } from "react-hook-form"

import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { catalogFieldStringValue } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.utils"

export const useProductEditorBasicFields = (control: Control<ProductFormValues>) => {
  const { field: skuField, fieldState: skuFieldState } = useController({
    control,
    name: "simpleVariant.sku",
  })

  const { field: slugField, fieldState: slugFieldState } = useController({
    control,
    name: "handle",
  })

  const skuValue = catalogFieldStringValue(skuField.value)
  const slugValue = catalogFieldStringValue(slugField.value)
  const handleSkuChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      skuField.onChange(event.target.value)
    },
    [skuField],
  )

  const handleSlugChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      slugField.onChange(event.target.value)
    },
    [slugField],
  )

  return {
    handleSkuChange,
    handleSlugChange,
    skuField,
    skuFieldState,
    skuValue,
    slugField,
    slugFieldState,
    slugValue,
  }
}
