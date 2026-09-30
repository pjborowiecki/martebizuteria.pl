import { type JSX, useCallback } from "react"

import { useTranslations } from "use-intl/react"

import { type User } from "~/src/modules/user/user.types"

import { Sheet, SheetDescription, SheetHeader, SheetTitle } from "~/src/presentation/components/shadcn/sheet"

import { CatalogFormSheetContent } from "~/src/presentation/components/custom/pages/admin/catalog/catalog-form-sheet-content"
import {
  CustomerForm,
  CustomerFormProvider,
} from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-form-provider"
import { CustomerFormSections } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-form-sections"
import { CustomerSheetFooter } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-sheet-footer"

export const CustomerSheet = ({ customer, onOpenChange, open }: Readonly<CustomerSheetProps>): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail.form")
  const handleDismiss = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  const handleSuccess = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <CatalogFormSheetContent>
        <CustomerFormProvider key={customer.id} customer={customer} open={open} onDismiss={handleDismiss} onSuccess={handleSuccess}>
          <SheetHeader className="shrink-0 space-y-1 border-b border-border px-6 py-5 pr-14">
            <SheetTitle className="text-base font-semibold tracking-tight">{t("title")}</SheetTitle>
            <SheetDescription className="max-w-md text-[13px] leading-relaxed text-muted-foreground">{t("description")}</SheetDescription>
          </SheetHeader>
          <CustomerForm>
            <div className="px-6 py-6">
              <CustomerFormSections />
            </div>
          </CustomerForm>
          <CustomerSheetFooter />
        </CustomerFormProvider>
      </CatalogFormSheetContent>
    </Sheet>
  )
}

interface CustomerSheetProps {
  readonly customer: User["adminCustomerDetail"]
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
}
