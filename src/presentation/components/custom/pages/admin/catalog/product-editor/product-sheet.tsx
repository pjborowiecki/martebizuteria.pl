import { type JSX, Suspense, useCallback } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { type Product } from "~/src/modules/product/product.types"
import { getAdminProductQuery } from "~/src/modules/product/use-cases/get-admin-product"

import { Sheet, SheetDescription, SheetHeader, SheetTitle } from "~/src/presentation/components/shadcn/sheet"

import { CatalogFormLocaleControlsProvider } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-locale-controls"
import {
  ProductForm,
  type ProductFormMode,
  ProductFormProvider,
} from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form-provider"
import { ProductSheetFooter } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-sheet-footer"
import { ProductSheetFormBody } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-sheet-form-body"
import { ProductSheetLoading } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-sheet-loading"
import { ProductFormSheetContent } from "~/src/presentation/components/custom/pages/admin/catalog/product-form-sheet-content"

export const ProductSheet = ({ mode, onOpenChange, open, product }: Readonly<ProductSheetProps>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products")
  const title = mode === "create" ? t("form.titleAdd") : t("form.titleEdit")
  const description = mode === "create" ? t("form.sheetDescription") : t("form.sheetDescriptionEdit")
  const handleDismiss = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  const handleSuccess = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  const sheetKey = mode === "create" ? "create" : (product?.id ?? "edit")
  if (mode === "create") {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <ProductFormSheetContent>
          <ProductSheetCreate
            key={sheetKey}
            description={description}
            onDismiss={handleDismiss}
            onSuccess={handleSuccess}
            open={open}
            title={title}
          />
        </ProductFormSheetContent>
      </Sheet>
    )
  }

  if (product === undefined) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <ProductFormSheetContent />
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ProductFormSheetContent>
        <ProductSheetEdit
          key={sheetKey}
          description={description}
          handle={product.handle}
          onDismiss={handleDismiss}
          onSuccess={handleSuccess}
          open={open}
          title={title}
        />
      </ProductFormSheetContent>
    </Sheet>
  )
}

const ProductSheetShell = ({ children, description, title }: Readonly<ProductSheetShellProps>): JSX.Element => (
  <>
    <SheetHeader className="shrink-0 space-y-1 border-b border-border px-6 py-5 pr-14">
      <SheetTitle className="text-base font-semibold tracking-tight">{title}</SheetTitle>
      <SheetDescription className="max-w-lg text-[13px] leading-relaxed text-muted-foreground">{description}</SheetDescription>
    </SheetHeader>
    {children}
    <ProductSheetFooter />
  </>
)

const ProductSheetCreate = ({ description, onDismiss, onSuccess, open, title }: Readonly<ProductSheetCreateProps>): JSX.Element => (
  <CatalogFormLocaleControlsProvider>
    <ProductFormProvider mode="create" open={open} onDismiss={onDismiss} onSuccess={onSuccess}>
      <ProductSheetShell description={description} title={title}>
        <ProductForm>
          <ProductSheetFormBody />
        </ProductForm>
      </ProductSheetShell>
    </ProductFormProvider>
  </CatalogFormLocaleControlsProvider>
)

const ProductSheetEditForm = ({ description, handle, onDismiss, onSuccess, open, title }: Readonly<ProductSheetEditProps>): JSX.Element => {
  const { data: productDetail } = useSuspenseQuery(getAdminProductQuery(handle))

  return (
    <CatalogFormLocaleControlsProvider>
      <ProductFormProvider initialProduct={productDetail} mode="edit" open={open} onDismiss={onDismiss} onSuccess={onSuccess}>
        <ProductSheetShell description={description} title={title}>
          <ProductForm>
            <ProductSheetFormBody />
          </ProductForm>
        </ProductSheetShell>
      </ProductFormProvider>
    </CatalogFormLocaleControlsProvider>
  )
}

const ProductSheetEdit = (props: Readonly<ProductSheetEditProps>): JSX.Element => (
  <Suspense fallback={<ProductSheetLoading description={props.description} title={props.title} />}>
    <ProductSheetEditForm {...props} />
  </Suspense>
)

interface ProductSheetProps {
  readonly mode: ProductFormMode
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
  readonly product: Product["adminListItem"] | undefined
}

interface ProductSheetShellProps {
  readonly children: JSX.Element
  readonly description: string
  readonly title: string
}

interface ProductSheetCreateProps {
  readonly description: string
  readonly onDismiss: () => void
  readonly onSuccess: () => void
  readonly open: boolean
  readonly title: string
}

interface ProductSheetEditProps {
  readonly description: string
  readonly handle: string
  readonly onDismiss: () => void
  readonly onSuccess: () => void
  readonly open: boolean
  readonly title: string
}
