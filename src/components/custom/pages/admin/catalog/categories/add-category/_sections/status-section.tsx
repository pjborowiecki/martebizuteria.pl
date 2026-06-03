import { type JSX, useMemo } from "react";

import { CircleDot } from "lucide-react";
import { useTranslations } from "use-intl";

import { Field } from "~/src/components/shadcn/field";

import { CategorySelectField } from "~/src/components/custom/pages/admin/catalog/categories/add-category/category-form-fields";
import { useCategoryForm } from "~/src/components/custom/pages/admin/catalog/categories/add-category/category-form-provider";
import { CategoryFormSection } from "~/src/components/custom/pages/admin/catalog/categories/add-category/category-form-section";
import { CatalogFormFieldLabel } from "~/src/components/custom/pages/admin/catalog/components/catalog-form-field-label";

import { CATEGORY_STATUSES, CATEGORY_STATUS_LABEL_KEYS } from "~/src/modules/category/category.constants";

export function StatusSection(): JSX.Element {
  const t = useTranslations("admin");
  const { control, isPending } = useCategoryForm();

  const statusOptions = useMemo(
    () =>
      CATEGORY_STATUSES.map((status) => ({
        label: t(CATEGORY_STATUS_LABEL_KEYS[status]),
        value: status
      })),
    [t]
  );

  return (
    <CategoryFormSection icon={CircleDot} title={t("categories.form.displayOptions")}>
      <Field className="gap-2">
        <CatalogFormFieldLabel hint={t("categories.form.hints.status")} label={t("categories.form.status")} />
        <CategorySelectField
          control={control}
          name="status"
          ariaLabel={t("categories.form.status")}
          options={statusOptions}
          disabled={isPending}
        />
      </Field>
    </CategoryFormSection>
  );
}
