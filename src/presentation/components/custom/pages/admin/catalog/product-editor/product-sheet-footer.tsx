import { type JSX } from "react"

import { Loader2 } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"

import {
  PRODUCT_FORM_ID,
  useProductForm,
} from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form-provider"

export const ProductSheetFooter = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products")
  const { dismiss, isPending, isUploading, mode } = useProductForm()
  const isSubmitDisabled = isPending || isUploading
  const submitLabel = mode === "create" ? t("form.create") : t("form.save")

  return (
    <div className="shrink-0 border-t border-border bg-background px-6 py-4">
      <div className="flex flex-row justify-end gap-3">
        <Button type="button" variant="outline" size="default" className="min-w-[88px]" disabled={isPending} onClick={dismiss}>
          {t("form.cancel")}
        </Button>
        <Button type="submit" form={PRODUCT_FORM_ID} disabled={isSubmitDisabled} className="min-w-[140px] gap-2">
          {isPending && <Loader2 aria-hidden className="size-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </div>
  )
}
