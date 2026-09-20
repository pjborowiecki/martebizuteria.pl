import { type JSX, Suspense } from "react"

import { useFormContext, useWatch } from "react-hook-form"

import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { ProductEditorAttributes } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-attributes"
import { ProductEditorBasic } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-basic"
import { ProductEditorMedia } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-media"
import { ProductEditorOrganization } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-organization"
import { ProductEditorPricing } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-pricing"
import { ProductEditorStatus } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-status"
import { ProductEditorTags } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-tags"
import { ProductEditorVariantMode } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-variant-mode"
import { ProductEditorVariantsSection } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-variants-section"
import { ProductFormLocaleLayout } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form-locale-layout"
const ProductSheetFormSections = ({
  hasVariants,
}: Readonly<{
  hasVariants: boolean
}>): JSX.Element => (
  <div className="space-y-6">
    <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
      <ProductEditorBasic />

      <div className="flex flex-col gap-4">
        <ProductEditorStatus />
        <Suspense fallback={organizationFallback}>
          <ProductEditorOrganization />
        </Suspense>
        <ProductEditorVariantMode />
        <ProductEditorPricing />
      </div>
    </div>

    {hasVariants && <ProductEditorVariantsSection />}

    <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
      <ProductEditorMedia fillHeight />
      <ProductEditorTags fillHeight />
    </div>

    {!hasVariants && (
      <Suspense fallback={attributesFallback}>
        <ProductEditorAttributes />
      </Suspense>
    )}
  </div>
)

export const ProductSheetFormBody = (): JSX.Element => {
  const { control } = useFormContext<ProductFormValues>()
  const hasVariants = useWatch({
    control,
    name: "hasVariants",
  })
  return (
    <div className="px-6 py-6">
      <ProductFormLocaleLayout>
        <ProductSheetFormSections hasVariants={hasVariants} />
      </ProductFormLocaleLayout>
    </div>
  )
}
const organizationFallback = <div className="h-36 rounded-lg bg-muted/30" />
const attributesFallback = <div className="h-32 rounded-lg bg-muted/30" />
