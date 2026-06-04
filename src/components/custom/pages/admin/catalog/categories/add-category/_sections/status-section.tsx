import { type JSX, useCallback, useMemo } from "react";

import { CircleDot } from "lucide-react";
import { useController } from "react-hook-form";
import { useTranslations } from "use-intl";

import { Field } from "~/src/components/shadcn/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/components/shadcn/select";

import { useCategoryForm } from "~/src/components/custom/pages/admin/catalog/categories/add-category/category-form-provider";
import { CategoryFormSection } from "~/src/components/custom/pages/admin/catalog/categories/add-category/category-form-section";
import { CatalogFormFieldError } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-field-error";
import { CatalogFormFieldLabel } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-field-label";

import {
  CATEGORY_FORM_VALIDATION_KEYS,
  CATEGORY_STATUSES,
  CATEGORY_STATUS_LABEL_KEYS
} from "~/src/modules/product-category/product-category.constants";

export function StatusSection(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.categories");
  const { control, isPending } = useCategoryForm();
  const validationKeySet = useMemo(() => new Set<string>(Object.values(CATEGORY_FORM_VALIDATION_KEYS)), []);
  const { field, fieldState } = useController({ control, name: "status" });

  const statusOptions = useMemo(
    () =>
      CATEGORY_STATUSES.map((status) => ({
        label: t(CATEGORY_STATUS_LABEL_KEYS[status]),
        value: status
      })),
    [t]
  );

  const handleStatusChange = useCallback(
    (value: string | null) => {
      if (value !== null) {
        field.onChange(value);
      }
    },
    [field]
  );

  return (
    <CategoryFormSection icon={CircleDot} title={t("form.displayOptions")}>
      <Field className="gap-2" data-invalid={fieldState.invalid}>
        <CatalogFormFieldLabel hint={t("form.hints.status")} label={t("form.status")} required />
        <Select disabled={isPending} items={statusOptions} onValueChange={handleStatusChange} value={field.value}>
          <SelectTrigger aria-invalid={fieldState.invalid} aria-label={t("form.status")} size="sheet">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
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
