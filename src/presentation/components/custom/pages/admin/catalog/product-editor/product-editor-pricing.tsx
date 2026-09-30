import { type JSX, useCallback, useMemo } from "react"

import { useController, useFormContext, useWatch } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { PRODUCT_FORM_VALIDATION_KEYS } from "~/src/modules/product/product.constants"
import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { Field, FieldError } from "~/src/presentation/components/shadcn/field"

import { CatalogFormFieldError } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-error"
import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import { CatalogIntegerInput } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-integer-input"
import { CatalogMoneyInput } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-money-input"
import {
  CATALOG_SHEET_CARD_CONTENT_CLASS,
  CATALOG_SHEET_FIELD_CLASS,
} from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.styles"

export const ProductEditorPricing = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products")
  const { control, formState } = useFormContext<ProductFormValues>()
  const hasVariants = useWatch({
    control,
    name: "hasVariants",
  })

  const validationKeySet = useMemo(() => new Set<string>(Object.values(PRODUCT_FORM_VALIDATION_KEYS)), [])
  const { field: priceField, fieldState: priceFieldState } = useController({
    control,
    name: "simpleVariant.price",
  })

  const { field: quantityField, fieldState: quantityFieldState } = useController({
    control,
    name: "simpleVariant.quantity",
  })

  const simpleVariantError = formState.errors.simpleVariant
  const simpleVariantMessage =
    simpleVariantError?.message === PRODUCT_FORM_VALIDATION_KEYS.simpleVariantRequired
      ? t(PRODUCT_FORM_VALIDATION_KEYS.simpleVariantRequired)
      : simpleVariantError?.message
  const handlePriceChange = useCallback(
    (nextValue: string) => {
      priceField.onChange(nextValue)
    },
    [priceField],
  )

  const handleQuantityChange = useCallback(
    (nextValue: number) => {
      quantityField.onChange(nextValue)
    },
    [quantityField],
  )

  if (hasVariants) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">{t("pricing.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("pricing.variantsHint")}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t("pricing.title")}</CardTitle>
      </CardHeader>
      <CardContent className={CATALOG_SHEET_CARD_CONTENT_CLASS}>
        <div className="grid grid-cols-2 gap-5">
          <Field className={CATALOG_SHEET_FIELD_CLASS} data-invalid={priceFieldState.invalid}>
            <CatalogFormFieldLabel hint={t("form.hints.price")} label={t("pricing.price")} required />
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-sm text-muted-foreground/40">
                PLN
              </span>
              <CatalogMoneyInput
                ariaInvalid={priceFieldState.invalid}
                className="pl-12"
                onValueChange={handlePriceChange}
                value={priceField.value ?? ""}
              />
            </div>
            <CatalogFormFieldError fieldState={priceFieldState} translate={t} validationKeySet={validationKeySet} />
          </Field>

          <Field className={CATALOG_SHEET_FIELD_CLASS} data-invalid={quantityFieldState.invalid}>
            <CatalogFormFieldLabel hint={t("form.hints.stockQuantity")} label={t("pricing.stockQuantity")} required />
            <CatalogIntegerInput
              ariaInvalid={quantityFieldState.invalid}
              min={DEFAULT_QUANTITY_MIN}
              onValueChange={handleQuantityChange}
              value={quantityField.value ?? DEFAULT_QUANTITY_MIN}
            />
            <CatalogFormFieldError fieldState={quantityFieldState} translate={t} validationKeySet={validationKeySet} />
          </Field>
        </div>
        {simpleVariantMessage !== undefined && simpleVariantMessage !== "" && (
          <Field data-invalid>
            <FieldError>{simpleVariantMessage}</FieldError>
          </Field>
        )}
      </CardContent>
    </Card>
  )
}

const DEFAULT_QUANTITY_MIN = 0
