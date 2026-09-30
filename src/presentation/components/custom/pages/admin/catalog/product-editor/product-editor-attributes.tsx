import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useFormContext, useWatch } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { getAdminProductAttributesQuery } from "~/src/modules/product-attribute/use-cases/get-admin-product-attributes"
import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

import { ProductEditorAttributeListPanel } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-attribute-list-panel"

export const ProductEditorAttributes = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.attributes")
  const { control } = useFormContext<ProductFormValues>()
  const hasVariants = useWatch({
    control,
    name: "hasVariants",
  })

  const { data: attributes } = useSuspenseQuery(getAdminProductAttributesQuery())

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t("title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{hasVariants ? t("hintSharedVariants") : t("hint")}</p>
      </CardHeader>
      <CardContent>
        <ProductEditorAttributeListPanel attributes={attributes} baseName="attributeValues" />
      </CardContent>
    </Card>
  )
}
