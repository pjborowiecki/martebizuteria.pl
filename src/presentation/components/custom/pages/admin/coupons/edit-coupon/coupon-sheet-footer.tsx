import { type JSX } from "react"

import { Loader2 } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"

import { COUPON_FORM_ID, useCouponForm } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-form-provider"

export const CouponSheetFooter = (): JSX.Element => {
  const t = useTranslations("pages.admin.coupons.form")
  const { dismiss, isPending, mode } = useCouponForm()

  return (
    <div className="shrink-0 border-t border-border bg-background px-6 py-4">
      <div className="flex flex-row justify-end gap-3">
        <Button className="min-w-[88px]" disabled={isPending} onClick={dismiss} size="default" type="button" variant="outline">
          {t("cancel")}
        </Button>
        <Button className="min-w-[140px] gap-2" disabled={isPending} form={COUPON_FORM_ID} type="submit">
          {isPending && <Loader2 aria-hidden className="size-4 animate-spin" />}
          {mode === "create" ? t("create") : t("save")}
        </Button>
      </div>
    </div>
  )
}
