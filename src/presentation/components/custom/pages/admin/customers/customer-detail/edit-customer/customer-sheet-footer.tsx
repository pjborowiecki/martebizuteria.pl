import { type JSX } from "react"

import { Loader2 } from "lucide-react"
import { useTranslations } from "use-intl"

import { Button } from "~/src/presentation/components/shadcn/button"

import {
  CUSTOMER_FORM_ID,
  useCustomerForm,
} from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-form-provider"
export const CustomerSheetFooter = (): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail.form")
  const { dismiss, isPending } = useCustomerForm()
  return (
    <div className="shrink-0 border-t border-border bg-background px-6 py-4">
      <div className="flex flex-row justify-end gap-3">
        <Button type="button" variant="outline" size="default" className="min-w-[88px]" disabled={isPending} onClick={dismiss}>
          {t("cancel")}
        </Button>
        <Button type="submit" form={CUSTOMER_FORM_ID} disabled={isPending} className="min-w-[140px] gap-2">
          {isPending && <Loader2 aria-hidden className="size-4 animate-spin" />}
          {t("save")}
        </Button>
      </div>
    </div>
  )
}
