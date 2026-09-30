import { type JSX, useCallback } from "react"

import { ImageIcon } from "lucide-react"
import { useController } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { Field } from "~/src/presentation/components/shadcn/field"

import { ImageUpload } from "~/src/presentation/components/custom/image-upload/components/image-upload"
import { useCategoryForm } from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-form-provider"
import { CategoryFormSection } from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-form-section"
import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"

export const MediaSection = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.categories")
  const { control, isPending, setUploading } = useCategoryForm()
  const { field, fieldState } = useController({
    control,
    name: "image",
  })

  const handleChange = useCallback(
    (url: string) => {
      field.onChange(url)
    },
    [field],
  )

  return (
    <CategoryFormSection icon={ImageIcon} title={t("form.mediaTitle")}>
      <Field className="gap-2" data-invalid={fieldState.invalid}>
        <CatalogFormFieldLabel hint={t("form.hints.image")} label={t("form.image")} />
        <ImageUpload
          value={field.value}
          onChange={handleChange}
          onUploadingChange={setUploading}
          folder="categories"
          disabled={isPending}
          invalid={fieldState.invalid}
          className="max-w-none"
        />
      </Field>
    </CategoryFormSection>
  )
}
