import { type JSX, useCallback } from "react";

import { ImageIcon } from "lucide-react";
import { useController } from "react-hook-form";
import { useTranslations } from "use-intl";

import { Field } from "~/src/components/shadcn/field";

import { ImageUpload } from "~/src/components/custom/admin/image-upload/components/image-upload";
import { useCategoryForm } from "~/src/components/custom/pages/admin/catalog/categories/add-category/category-form-provider";
import { CategoryFormSection } from "~/src/components/custom/pages/admin/catalog/categories/add-category/category-form-section";
import { CatalogFormFieldLabel } from "~/src/components/custom/pages/admin/catalog/components/catalog-form-field-label";

export function MediaSection(): JSX.Element {
  const t = useTranslations("admin");
  const { control, isPending, setUploading } = useCategoryForm();
  const { field, fieldState } = useController({ control, name: "image" });

  const handleChange = useCallback(
    (url: string) => {
      field.onChange(url);
    },
    [field]
  );

  return (
    <CategoryFormSection icon={ImageIcon} title={t("categories.form.mediaTitle")}>
      <Field className="gap-2" data-invalid={fieldState.invalid}>
        <CatalogFormFieldLabel hint={t("categories.form.hints.image")} label={t("categories.form.image")} />
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
  );
}
