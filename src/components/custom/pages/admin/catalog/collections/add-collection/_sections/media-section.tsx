import { type JSX, useCallback } from "react";

import { ImageIcon } from "lucide-react";
import { useController } from "react-hook-form";
import { useTranslations } from "use-intl";

import { Field } from "~/src/components/shadcn/field";

import { ImageUpload } from "~/src/components/custom/admin/image-upload/components/image-upload";
import { useCollectionForm } from "~/src/components/custom/pages/admin/catalog/collections/add-collection/collection-form-provider";
import { CollectionFormSection } from "~/src/components/custom/pages/admin/catalog/collections/add-collection/collection-form-section";

export function MediaSection(): JSX.Element {
  const t = useTranslations("admin");
  const { control, isPending, setUploading } = useCollectionForm();
  const { field, fieldState } = useController({ control, name: "image" });

  const handleChange = useCallback(
    (url: string) => {
      field.onChange(url);
    },
    [field]
  );

  return (
    <CollectionFormSection icon={ImageIcon} title={t("collections.form.mediaTitle")}>
      <Field data-invalid={fieldState.invalid}>
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
