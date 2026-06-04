import { type JSX, useCallback, useMemo } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { FolderTree } from "lucide-react";
import { useController } from "react-hook-form";
import { useLocale, useTranslations } from "use-intl";

import { Field } from "~/src/components/shadcn/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/components/shadcn/select";

import { useCategoryForm } from "~/src/components/custom/pages/admin/catalog/categories/add-category/category-form-provider";
import { CategoryFormSection } from "~/src/components/custom/pages/admin/catalog/categories/add-category/category-form-section";
import { CatalogFormFieldError } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-field-error";
import { CatalogFormFieldLabel } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-field-label";

import { CATEGORY_FORM_VALIDATION_KEYS } from "~/src/modules/product-category/product-category.constants";
import { categoryQueryOptions } from "~/src/modules/product-category/product-category.queries";
import { resolveCategoryTitle } from "~/src/modules/product-category/product-category.utils";

const NO_PARENT_VALUE = "";

export function ParentCategorySection(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.categories");
  const locale = useLocale();
  const { categoryId, control, isPending } = useCategoryForm();
  const validationKeySet = useMemo(() => new Set<string>(Object.values(CATEGORY_FORM_VALIDATION_KEYS)), []);
  const { field, fieldState } = useController({ control, name: "parentId" });
  const { data: categories } = useSuspenseQuery(categoryQueryOptions.adminCategoriesQueryOptions());

  const parentOptions = useMemo(() => {
    const options = [{ label: t("form.noParent"), value: NO_PARENT_VALUE }];
    for (const item of categories.filter((row) => row.id !== categoryId)) {
      options.push({ label: resolveCategoryTitle(item.titles, locale), value: item.id });
    }
    return options;
  }, [categories, categoryId, locale, t]);

  const handleParentChange = useCallback(
    (value: string | null) => {
      if (value !== null) {
        field.onChange(value);
      }
    },
    [field]
  );

  return (
    <CategoryFormSection icon={FolderTree} title={t("form.sectionParent")}>
      <Field className="gap-2" data-invalid={fieldState.invalid}>
        <CatalogFormFieldLabel hint={t("form.hints.parentCategory")} label={t("form.parentCategory")} />
        <Select disabled={isPending} items={parentOptions} onValueChange={handleParentChange} value={field.value}>
          <SelectTrigger aria-invalid={fieldState.invalid} aria-label={t("form.parentCategory")} size="sheet">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {parentOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <CatalogFormFieldError fieldState={fieldState} translate={t} validationKeySet={validationKeySet} />
      </Field>
    </CategoryFormSection>
  );
}
