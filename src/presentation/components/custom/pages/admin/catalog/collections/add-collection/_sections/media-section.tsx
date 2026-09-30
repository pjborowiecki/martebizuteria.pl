import { type JSX, useCallback } from "react"

import { ImageIcon } from "lucide-react"
import { useController } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { Field } from "~/src/presentation/components/shadcn/field"

import { ImageUpload } from "~/src/presentation/components/custom/image-upload/components/image-upload"
import { useCollectionForm } from "~/src/presentation/components/custom/pages/admin/catalog/collections/add-collection/collection-form-provider"
import { CollectionFormSection } from "~/src/presentation/components/custom/pages/admin/catalog/collections/add-collection/collection-form-section"
import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"

export const MediaSection = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.collections")
  const { control, isPending, setUploading } = useCollectionForm()
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
    <CollectionFormSection icon={ImageIcon} title={t("form.mediaTitle")}>
      <Field className="gap-2" data-invalid={fieldState.invalid}>
        <CatalogFormFieldLabel hint={t("form.hints.coverImage")} label={t("form.coverImage")} />
        <ImageUpload
          value={field.value}
          onChange={handleChange}
          onUploadingChange={setUploading}
          folder="collections"
          disabled={isPending}
          invalid={fieldState.invalid}
          className="max-w-none"
        />
      </Field>
    </CollectionFormSection>
  )
}
