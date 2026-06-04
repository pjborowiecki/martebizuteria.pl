import { type JSX, useCallback } from "react";

import { ImageIcon } from "lucide-react";
import { useController } from "react-hook-form";
import { useTranslations } from "use-intl";

import { Field } from "~/src/components/shadcn/field";

import { ImageUpload } from "~/src/components/custom/admin/image-upload/components/image-upload";
import { useCollectionForm } from "~/src/components/custom/pages/admin/catalog/collections/add-collection/collection-form-provider";
import { CollectionFormSection } from "~/src/components/custom/pages/admin/catalog/collections/add-collection/collection-form-section";
import { CatalogFormFieldLabel } from "~/src/components/custom/pages/admin/catalog/components/catalog-form-field-label";

export function MediaSection(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.collections");
  const { control, isPending, setUploading } = useCollectionForm();
  const { field, fieldState } = useController({ control, name: "image" });

  const handleChange = useCallback(
    (url: string) => {
      field.onChange(url);
    },
    [field]
  );

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
  );
}
