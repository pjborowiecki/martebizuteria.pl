import { type JSX } from "react"

import { useFormContext } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { PRODUCT_FORM_VALIDATION_KEYS } from "~/src/modules/product/product.constants"
import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { Field, FieldError } from "~/src/presentation/components/shadcn/field"

import { ProductEditorVariantList } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-variant-list"

const resolveFormErrorMessage = (t: (key: string) => string, message: string | undefined): string | undefined => {
  if (message === undefined || message === "") {
    return undefined
  }

  return PRODUCT_FORM_VALIDATION_KEY_SET.has(message) ? t(message) : message
}

export const ProductEditorVariantsSection = (): JSX.Element => {
  const tProducts = useTranslations("pages.admin.catalog.products")
  const t = useTranslations("pages.admin.catalog.products.variants")
  const {
    formState: { errors },
  } = useFormContext<ProductFormValues>()

  const optionsMessage = resolveFormErrorMessage(tProducts, errors.options?.message)
  const variantsMessage = resolveFormErrorMessage(tProducts, errors.variants?.message)

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base font-semibold">{t("title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("sectionHint")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {(optionsMessage !== undefined || variantsMessage !== undefined) && (
          <div className="space-y-2">
            {optionsMessage !== undefined && (
              <Field data-invalid>
                <FieldError>{optionsMessage}</FieldError>
              </Field>
            )}
            {variantsMessage !== undefined && (
              <Field data-invalid>
                <FieldError>{variantsMessage}</FieldError>
              </Field>
            )}
          </div>
        )}
        <ProductEditorVariantList />
      </CardContent>
    </Card>
  )
}

const PRODUCT_FORM_VALIDATION_KEY_SET = new Set<string>(Object.values(PRODUCT_FORM_VALIDATION_KEYS))
