import { type JSX, useCallback, useMemo } from "react"

import { useFormContext, useWatch } from "react-hook-form"
import { useTranslations } from "use-intl"

import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { Field } from "~/src/presentation/components/shadcn/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import {
  CATALOG_SHEET_CARD_CONTENT_CLASS,
  CATALOG_SHEET_FIELD_CLASS,
} from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.styles"
import { regenerateVariantRows } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form.utils"
import { createImplicitVariantOptionSetup } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-variant-form.utils"
export const ProductEditorVariantMode = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products")
  const tVariantMode = useTranslations("pages.admin.catalog.products.variantMode")
  const { control, getValues, setValue } = useFormContext<ProductFormValues>()
  const hasVariants = useWatch({
    control,
    name: "hasVariants",
  })
  const productType: ProductTypeValue = hasVariants ? PRODUCT_TYPE_VARIANTS : PRODUCT_TYPE_SIMPLE
  const typeOptions = useMemo(
    () => [
      {
        label: tVariantMode("optionSimple"),
        value: PRODUCT_TYPE_SIMPLE,
      },
      {
        label: tVariantMode("optionVariants"),
        value: PRODUCT_TYPE_VARIANTS,
      },
    ],
    [tVariantMode],
  )
  const applyProductType = useCallback(
    (nextType: ProductTypeValue) => {
      const enableVariants = nextType === PRODUCT_TYPE_VARIANTS
      if (enableVariants === hasVariants) {
        return
      }
      setValue("hasVariants", enableVariants, {
        shouldDirty: true,
      })
      if (!enableVariants) {
        const [firstVariant] = getValues("variants")
        if (firstVariant !== undefined) {
          setValue("simpleVariant", {
            compareAtPrice: firstVariant.compareAtPrice,
            manageInventory: true,
            price: firstVariant.price,
            quantity: firstVariant.quantity,
            sku: firstVariant.sku,
          })
        }
        setValue("options", [])
        setValue("variants", [])
        return
      }
      const simple = getValues("simpleVariant")
      const optionSetup = createImplicitVariantOptionSetup()
      setValue("options", [optionSetup], {
        shouldDirty: true,
      })
      setValue(
        "variants",
        regenerateVariantRows(
          [optionSetup],
          [
            {
              attributeValues: [],
              compareAtPrice: simple?.compareAtPrice ?? "",
              images: [],
              manageInventory: true,
              optionValues: {},
              price: simple?.price ?? "",
              quantity: simple?.quantity ?? 0,
              sku: simple?.sku ?? "",
              title: "",
            },
          ],
        ),
        {
          shouldDirty: true,
        },
      )
    },
    [getValues, hasVariants, setValue],
  )
  const handleTypeChange = useCallback(
    (value: ProductTypeValue | null) => {
      if (value === null) {
        return
      }
      applyProductType(value)
    },
    [applyProductType],
  )
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{tVariantMode("title")}</CardTitle>
      </CardHeader>
      <CardContent className={CATALOG_SHEET_CARD_CONTENT_CLASS}>
        <Field className={CATALOG_SHEET_FIELD_CLASS}>
          <CatalogFormFieldLabel hint={t("form.hints.productType")} label={tVariantMode("typeLabel")} required />
          <Select items={typeOptions} onValueChange={handleTypeChange} value={productType}>
            <SelectTrigger aria-label={tVariantMode("typeLabel")} size="sheet" id="product-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PRODUCT_TYPE_SIMPLE}>{tVariantMode("optionSimple")}</SelectItem>
              <SelectItem value={PRODUCT_TYPE_VARIANTS}>{tVariantMode("optionVariants")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </CardContent>
    </Card>
  )
}
const PRODUCT_TYPE_SIMPLE = "simple"
const PRODUCT_TYPE_VARIANTS = "variants"
type ProductTypeValue = typeof PRODUCT_TYPE_SIMPLE | typeof PRODUCT_TYPE_VARIANTS
