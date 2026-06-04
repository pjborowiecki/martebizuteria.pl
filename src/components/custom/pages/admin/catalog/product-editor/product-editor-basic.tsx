import { type ChangeEvent, type JSX, useCallback, useMemo, useState } from "react";

import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "~/src/components/shadcn/card";
import { Field } from "~/src/components/shadcn/field";
import { Input } from "~/src/components/shadcn/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/src/components/shadcn/input-group";

import { CatalogFormFieldError } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-field-error";
import { CatalogFormFieldLabel } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-field-label";
import {
  ProductCatalogLocaleFormField,
  ProductCatalogLocaleTextareaFormField,
  type CatalogLocaleFieldsCopy
} from "~/src/components/custom/pages/admin/catalog/form/components/catalog-locale-fields";
import {
  CATALOG_SHEET_CARD_CONTENT_CLASS,
  CATALOG_SHEET_FIELD_CLASS
} from "~/src/components/custom/pages/admin/catalog/form/lib/catalog-form.styles";
import { normalizeSlugInput, slugify } from "~/src/components/custom/pages/admin/catalog/form/lib/catalog-slug.utils";
import type { ProductFormValues } from "~/src/components/custom/pages/admin/catalog/product-editor/product-form.utils";
import { useProductEditorBasicFields } from "~/src/components/custom/pages/admin/catalog/product-editor/use-product-editor-basic-fields";

import { PRODUCT_COLUMN_LENGTH, PRODUCT_FORM_VALIDATION_KEYS } from "~/src/modules/product/product.constants";

export function ProductEditorBasic(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products");
  const { control, setValue } = useFormContext<ProductFormValues>();
  const hasVariants = useWatch({ control, name: "hasVariants" });
  const validationKeySet = useMemo(() => new Set<string>(Object.values(PRODUCT_FORM_VALIDATION_KEYS)), []);
  const fields = useProductEditorBasicFields(control);
  const [handleLocked, setHandleLocked] = useState(false);

  const titleCopy = useMemo<CatalogLocaleFieldsCopy>(
    () => ({
      hint: (locale) => t(`form.hints.titleLocale.${locale}`),
      label: (locale) => t(`form.titleLocale.${locale}`),
      placeholder: (locale) => t(`form.titleLocalePlaceholder.${locale}`)
    }),
    [t]
  );

  const subtitleCopy = useMemo<CatalogLocaleFieldsCopy>(
    () => ({
      hint: (locale) => t(`form.hints.subtitleLocale.${locale}`),
      label: (locale) => t(`form.subtitleLocale.${locale}`),
      placeholder: (locale) => t(`form.subtitleLocalePlaceholder.${locale}`)
    }),
    [t]
  );

  const descriptionCopy = useMemo<CatalogLocaleFieldsCopy>(
    () => ({
      hint: (locale) => t(`form.hints.descriptionLocale.${locale}`),
      label: (locale) => t(`form.descriptionLocale.${locale}`),
      placeholder: (locale) => t(`form.descriptionLocalePlaceholder.${locale}`)
    }),
    [t]
  );

  const syncHandleFromTitle = useCallback(
    (value: string) => {
      if (!handleLocked) {
        setValue("handle", slugify(value), { shouldValidate: false });
      }
    },
    [handleLocked, setValue]
  );

  const handleSlugInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setHandleLocked(true);
      fields.slugField.onChange(normalizeSlugInput(event.target.value));
    },
    [fields.slugField]
  );

  const handleSlugBlur = useCallback(() => {
    fields.slugField.onChange(slugify(fields.slugValue));
  }, [fields.slugField, fields.slugValue]);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t("basic.title")}</CardTitle>
      </CardHeader>
      <CardContent className={cn("flex min-h-0 flex-1 flex-col", CATALOG_SHEET_CARD_CONTENT_CLASS)}>
        <div className="grid grid-cols-2 gap-5">
          <ProductCatalogLocaleFormField
            control={control}
            copy={titleCopy}
            maxLength={PRODUCT_COLUMN_LENGTH.title}
            name="titles"
            onDefaultLocaleChange={syncHandleFromTitle}
            required
            translateValidation={t}
            validationKeySet={validationKeySet}
          />

          {!hasVariants && (
            <Field className={CATALOG_SHEET_FIELD_CLASS} data-invalid={fields.skuFieldState.invalid}>
              <CatalogFormFieldLabel
                counter={`${fields.skuValue.length}/${PRODUCT_COLUMN_LENGTH.sku}`}
                hint={t("form.hints.sku")}
                label={t("basic.ref")}
              />
              <Input
                {...fields.skuField}
                aria-invalid={fields.skuFieldState.invalid}
                className="font-mono"
                variant="sheet"
                id="product-sku"
                maxLength={PRODUCT_COLUMN_LENGTH.sku}
                onChange={fields.handleSkuChange}
                placeholder="MRT-0001"
                type="text"
                value={fields.skuValue}
              />
              <CatalogFormFieldError fieldState={fields.skuFieldState} translate={t} validationKeySet={validationKeySet} />
            </Field>
          )}
        </div>

        <Field className={CATALOG_SHEET_FIELD_CLASS} data-invalid={fields.slugFieldState.invalid}>
          <CatalogFormFieldLabel
            counter={`${fields.slugValue.length}/${PRODUCT_COLUMN_LENGTH.handle}`}
            hint={t("form.hints.slug")}
            label={t("basic.slug")}
            required
          />
          <InputGroup variant="sheet">
            <InputGroupAddon className="border-r border-border pr-3 text-[13px] font-normal text-muted-foreground">
              /products/
            </InputGroupAddon>
            <InputGroupInput
              {...fields.slugField}
              aria-invalid={fields.slugFieldState.invalid}
              id="product-handle"
              maxLength={PRODUCT_COLUMN_LENGTH.handle}
              onBlur={handleSlugBlur}
              onChange={handleSlugInputChange}
              placeholder={t("basic.slugPlaceholder")}
              type="text"
              value={fields.slugValue}
            />
          </InputGroup>
          <CatalogFormFieldError fieldState={fields.slugFieldState} translate={t} validationKeySet={validationKeySet} />
        </Field>

        <ProductCatalogLocaleFormField
          control={control}
          copy={subtitleCopy}
          maxLength={PRODUCT_COLUMN_LENGTH.subtitle}
          name="subtitles"
          translateValidation={t}
          validationKeySet={validationKeySet}
        />

        <div className={cn(CATALOG_SHEET_FIELD_CLASS, "flex min-h-0 flex-1 flex-col")}>
          <ProductCatalogLocaleTextareaFormField
            control={control}
            copy={descriptionCopy}
            fillHeight
            maxLength={PRODUCT_COLUMN_LENGTH.description}
            name="descriptions"
            translateValidation={t}
            validationKeySet={validationKeySet}
          />
        </div>
      </CardContent>
    </Card>
  );
}
