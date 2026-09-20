import { type ChangeEvent, useCallback, useState } from "react"

import { type ControllerRenderProps, type UseFormSetValue } from "react-hook-form"

import { type Category } from "~/src/modules/product-category/product-category.types"

import { normalizeSlugInput, slugify } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-slug.utils"
export const useCategoryHandleSync = ({ handleField, setValue, titleField }: UseCategoryHandleSyncParams): UseCategoryHandleSyncResult => {
  const [handleLocked, setHandleLocked] = useState(false)
  const syncHandleFromTitle = useCallback(
    (value: string) => {
      if (!handleLocked) {
        setValue("handle", slugify(value), {
          shouldValidate: false,
        })
      }
    },
    [handleLocked, setValue],
  )
  const handleTitleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      titleField.onChange(event)
      syncHandleFromTitle(event.target.value)
    },
    [syncHandleFromTitle, titleField],
  )
  const handleSlugInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setHandleLocked(true)
      handleField.onChange(normalizeSlugInput(event.target.value))
    },
    [handleField],
  )
  return {
    handleSlugInputChange,
    handleTitleInputChange,
  }
}
interface UseCategoryHandleSyncParams {
  readonly handleField: ControllerRenderProps<Category["formValues"], "handle">
  readonly setValue: UseFormSetValue<Category["formValues"]>
  readonly titleField: ControllerRenderProps<Category["formValues"], "titles.pl">
}
interface UseCategoryHandleSyncResult {
  readonly handleSlugInputChange: (event: ChangeEvent<HTMLInputElement>) => void
  readonly handleTitleInputChange: (event: ChangeEvent<HTMLInputElement>) => void
}
