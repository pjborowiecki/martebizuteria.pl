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
  const t = useTranslations("pages.admin.catalog.categories");
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
    <CategoryFormSection icon={Info} title={t("form.sectionBasic")}>
      {displayId !== undefined && displayId !== "" && (
        <CatalogFormReadOnlyField label={t("form.id")} hint={t("form.hints.id")} value={displayId} />
      )}
      <CategoryTextField
        control={control}
        name="title"
        label={t("form.title")}
        labelHint={t("form.hints.title")}
        placeholder={t("form.titlePlaceholder")}
        counterMax={CATEGORY_COLUMN_LENGTH.title}
        disabled={isPending}
        onValueChange={handleTitleChange}
      />
      <CategorySlugField
        control={control}
        name="handle"
        label={t("form.slug")}
        labelHint={t("form.hints.slug")}
        counterMax={CATEGORY_COLUMN_LENGTH.handle}
        normalize={slugify}
        onManualEdit={lockHandle}
        disabled={isPending}
      />
      <CategoryTextField
        control={control}
        name="subtitle"
        label={t("form.subtitle")}
        labelHint={t("form.hints.subtitle")}
        placeholder={t("form.subtitlePlaceholder")}
        counterMax={CATEGORY_COLUMN_LENGTH.subtitle}
        disabled={isPending}
      />
      <CategoryTextareaField
        control={control}
        name="shortDescription"
        label={t("form.shortDescription")}
        labelHint={t("form.hints.shortDescription")}
        placeholder={t("form.shortDescriptionPlaceholder")}
        counterMax={CATEGORY_COLUMN_LENGTH.shortDescription}
        rows={3}
        disabled={isPending}
      />
      <CategoryTextareaField
        control={control}
        name="description"
        label={t("form.description")}
        labelHint={t("form.hints.description")}
        placeholder={t("form.descriptionPlaceholder")}
        counterMax={CATEGORY_COLUMN_LENGTH.description}
        className={CATALOG_FORM_DESCRIPTION_TEXTAREA_CLASS}
        rows={7}
        disabled={isPending}
      />
    </CategoryFormSection>
  );
}
