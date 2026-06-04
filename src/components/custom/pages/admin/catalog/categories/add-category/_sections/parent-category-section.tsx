import { type JSX, useMemo } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { FolderTree } from "lucide-react";
import { useTranslations } from "use-intl";

import { Field } from "~/src/components/shadcn/field";

import { CategorySelectField } from "~/src/components/custom/pages/admin/catalog/categories/add-category/category-form-fields";
import { useCategoryForm } from "~/src/components/custom/pages/admin/catalog/categories/add-category/category-form-provider";
import { CategoryFormSection } from "~/src/components/custom/pages/admin/catalog/categories/add-category/category-form-section";
import { CatalogFormFieldLabel } from "~/src/components/custom/pages/admin/catalog/components/catalog-form-field-label";

import { categoryQueryOptions } from "~/src/modules/category/category.queries";

const NO_PARENT_VALUE = "";

export function ParentCategorySection(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.categories");
  const { categoryId, control, isPending } = useCategoryForm();
  const { data: categories } = useSuspenseQuery(categoryQueryOptions.adminCategoriesQueryOptions());

  const parentOptions = useMemo(() => {
    const options = [{ label: t("form.noParent"), value: NO_PARENT_VALUE }];
    for (const item of categories.filter((row) => row.id !== categoryId)) {
      options.push({ label: item.title, value: item.id });
    }
    return options;
  }, [categories, categoryId, t]);

  return (
    <CategoryFormSection icon={FolderTree} title={t("form.sectionParent")}>
      <Field className="gap-2">
        <CatalogFormFieldLabel hint={t("form.hints.parentCategory")} label={t("form.parentCategory")} />
        <CategorySelectField
          control={control}
          name="parentId"
          ariaLabel={t("form.parentCategory")}
          options={parentOptions}
          disabled={isPending}
        />
      </Field>
    </CategoryFormSection>
  );
}
