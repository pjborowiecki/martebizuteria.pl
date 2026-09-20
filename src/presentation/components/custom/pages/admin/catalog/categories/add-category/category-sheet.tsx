import { type JSX, useCallback } from "react"

import { useTranslations } from "use-intl"

import { type Category } from "~/src/modules/product-category/product-category.types"

import { Sheet, SheetDescription, SheetHeader, SheetTitle } from "~/src/presentation/components/shadcn/sheet"

import { CatalogFormSheetContent } from "~/src/presentation/components/custom/pages/admin/catalog/catalog-form-sheet-content"
import { BasicDetailsSection } from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/_sections/basic-details-section"
import { MediaSection } from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/_sections/media-section"
import { ParentCategorySection } from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/_sections/parent-category-section"
import { StatusSection } from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/_sections/status-section"
import { CategoryFormLocaleLayout } from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-form-locale-layout"
import {
  CategoryForm,
  type CategoryFormMode,
  CategoryFormProvider,
} from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-form-provider"
import { CategorySheetFooter } from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-sheet-footer"
import { CatalogFormLocaleControlsProvider } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-locale-controls"
const CategorySheetSections = ({
  recordId,
}: Readonly<{
  recordId?: string | undefined
}>): JSX.Element => (
  <>
    <BasicDetailsSection recordId={recordId} />
    <ParentCategorySection />
    <StatusSection />
    <MediaSection />
  </>
)

const CategorySheetFormBody = ({
  recordId,
}: Readonly<{
  recordId?: string | undefined
}>): JSX.Element => (
  <>
    <CategoryForm>
      <div className="px-6 py-6">
        <CategoryFormLocaleLayout>
          <div className="space-y-10">
            <CategorySheetSections recordId={recordId} />
          </div>
        </CategoryFormLocaleLayout>
      </div>
    </CategoryForm>
    <CategorySheetFooter />
  </>
)

const CategorySheetHeader = ({
  description,
  title,
}: Readonly<{
  description: string
  title: string
}>): JSX.Element => (
  <SheetHeader className="shrink-0 space-y-1 border-b border-border px-6 py-5 pr-14">
    <SheetTitle className="text-base font-semibold tracking-tight">{title}</SheetTitle>
    <SheetDescription className="max-w-md text-[13px] leading-relaxed text-muted-foreground">{description}</SheetDescription>
  </SheetHeader>
)

export const CategorySheet = ({ category, mode, onOpenChange, open }: CategorySheetProps): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.categories")
  const title = mode === "create" ? t("form.titleAdd") : t("form.titleEdit")
  const description = mode === "create" ? t("form.sheetDescription") : t("form.sheetDescriptionEdit")
  const handleDismiss = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])
  const handleSuccess = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <CatalogFormSheetContent>
        <CatalogFormLocaleControlsProvider>
          <CategoryFormProvider
            key={category?.id ?? "create"}
            category={category}
            mode={mode}
            open={open}
            onDismiss={handleDismiss}
            onSuccess={handleSuccess}
          >
            <CategorySheetHeader description={description} title={title} />
            <CategorySheetFormBody recordId={category?.id} />
          </CategoryFormProvider>
        </CatalogFormLocaleControlsProvider>
      </CatalogFormSheetContent>
    </Sheet>
  )
}
interface CategorySheetProps {
  readonly category: Category["adminListItem"] | undefined
  readonly mode: CategoryFormMode
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
}
