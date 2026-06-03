import { type JSX, useCallback, useState } from "react";

import { Info } from "lucide-react";
import { useTranslations } from "use-intl";

import {
  CategorySlugField,
  CategoryTextField,
  CategoryTextareaField
} from "~/src/components/custom/pages/admin/catalog/categories/add-category/category-form-fields";
import { useCategoryForm } from "~/src/components/custom/pages/admin/catalog/categories/add-category/category-form-provider";
import { CategoryFormSection } from "~/src/components/custom/pages/admin/catalog/categories/add-category/category-form-section";
import { slugify } from "~/src/components/custom/pages/admin/catalog/categories/add-category/category-form.utils";
import { CatalogFormReadOnlyField } from "~/src/components/custom/pages/admin/catalog/components/catalog-form-read-only-field";
import { CATALOG_FORM_DESCRIPTION_TEXTAREA_CLASS } from "~/src/components/custom/pages/admin/catalog/components/catalog-form.styles";

import { CATEGORY_COLUMN_LENGTH } from "~/src/modules/category/category.constants";

interface BasicDetailsSectionProps {
  /** Row id from the sheet (edit mode); preferred over form context when both are set. */
  readonly recordId?: string;
}

export function BasicDetailsSection({ recordId }: Readonly<BasicDetailsSectionProps>): JSX.Element {
  const t = useTranslations("admin");
  const { categoryId, control, isPending, mode, setValue } = useCategoryForm();
  const displayId = recordId ?? (mode === "edit" ? categoryId : undefined);

  const [handleLocked, setHandleLocked] = useState(false);

  const handleTitleChange = useCallback(
    (value: string) => {
      if (!handleLocked) {
        setValue("handle", slugify(value), { shouldValidate: false });
      }
    },
    [handleLocked, setValue]
  );

  const lockHandle = useCallback(() => {
    setHandleLocked(true);
  }, []);

  return (
    <CategoryFormSection icon={Info} title={t("categories.form.sectionBasic")}>
      {displayId !== undefined && displayId !== "" && (
        <CatalogFormReadOnlyField label={t("categories.form.id")} hint={t("categories.form.hints.id")} value={displayId} />
      )}
      <CategoryTextField
        control={control}
        name="title"
        label={t("categories.form.title")}
        labelHint={t("categories.form.hints.title")}
        placeholder={t("categories.form.titlePlaceholder")}
        counterMax={CATEGORY_COLUMN_LENGTH.title}
        disabled={isPending}
        onValueChange={handleTitleChange}
      />
      <CategorySlugField
        control={control}
        name="handle"
        label={t("categories.form.slug")}
        labelHint={t("categories.form.hints.slug")}
        counterMax={CATEGORY_COLUMN_LENGTH.handle}
        normalize={slugify}
        onManualEdit={lockHandle}
        disabled={isPending}
      />
      <CategoryTextField
        control={control}
        name="subtitle"
        label={t("categories.form.subtitle")}
        labelHint={t("categories.form.hints.subtitle")}
        placeholder={t("categories.form.subtitlePlaceholder")}
        counterMax={CATEGORY_COLUMN_LENGTH.subtitle}
        disabled={isPending}
      />
      <CategoryTextareaField
        control={control}
        name="shortDescription"
        label={t("categories.form.shortDescription")}
        labelHint={t("categories.form.hints.shortDescription")}
        placeholder={t("categories.form.shortDescriptionPlaceholder")}
        counterMax={CATEGORY_COLUMN_LENGTH.shortDescription}
        rows={3}
        disabled={isPending}
      />
      <CategoryTextareaField
        control={control}
        name="description"
        label={t("categories.form.description")}
        labelHint={t("categories.form.hints.description")}
        placeholder={t("categories.form.descriptionPlaceholder")}
        counterMax={CATEGORY_COLUMN_LENGTH.description}
        className={CATALOG_FORM_DESCRIPTION_TEXTAREA_CLASS}
        rows={7}
        disabled={isPending}
      />
    </CategoryFormSection>
  );
}
