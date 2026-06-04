import { type JSX, useCallback, useMemo } from "react";

import { useController, useFormContext } from "react-hook-form";
import { useTranslations } from "use-intl";

import { Card, CardContent, CardHeader, CardTitle } from "~/src/components/shadcn/card";
import { Field } from "~/src/components/shadcn/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/components/shadcn/select";

import { CatalogFormFieldError } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-field-error";
import { CatalogFormFieldLabel } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-field-label";
import {
  CATALOG_SHEET_CARD_CONTENT_CLASS,
  CATALOG_SHEET_FIELD_CLASS
} from "~/src/components/custom/pages/admin/catalog/form/lib/catalog-form.styles";
import type { ProductFormValues } from "~/src/components/custom/pages/admin/catalog/product-editor/product-form.utils";

import { PRODUCT_ADMIN_STATUS, PRODUCT_FORM_VALIDATION_KEYS } from "~/src/modules/product/product.constants";

export function ProductEditorStatus(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products");
  const { control } = useFormContext<ProductFormValues>();
  const validationKeySet = useMemo(() => new Set<string>(Object.values(PRODUCT_FORM_VALIDATION_KEYS)), []);
  const { field, fieldState } = useController({ control, name: "status" });

  const statusOptions = useMemo(
    () => [
      { label: t("status.draft"), value: PRODUCT_ADMIN_STATUS.DRAFT },
      { label: t("status.active"), value: PRODUCT_ADMIN_STATUS.ACTIVE },
      { label: t("status.archived"), value: PRODUCT_ADMIN_STATUS.ARCHIVED }
    ],
    [t]
  );

  const handleStatusChange = useCallback(
    (value: string | null) => {
      field.onChange(value ?? "");
    },
    [field]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t("status.title")}</CardTitle>
      </CardHeader>
      <CardContent className={CATALOG_SHEET_CARD_CONTENT_CLASS}>
        <Field className={CATALOG_SHEET_FIELD_CLASS} data-invalid={fieldState.invalid}>
          <CatalogFormFieldLabel hint={t("form.hints.status")} label={t("status.label")} required />
          <Select items={statusOptions} onValueChange={handleStatusChange} value={field.value}>
            <SelectTrigger aria-invalid={fieldState.invalid} aria-label={t("status.label")} size="sheet">
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
      </CardContent>
    </Card>
  );
}
