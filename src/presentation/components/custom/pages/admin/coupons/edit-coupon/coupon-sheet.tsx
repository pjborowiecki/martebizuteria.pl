import { type JSX, useCallback } from "react"

import { useTranslations } from "use-intl/react"

import { type Discount } from "~/src/modules/discount/discount.types"

import { Sheet, SheetDescription, SheetHeader, SheetTitle } from "~/src/presentation/components/shadcn/sheet"

import { CatalogFormSheetContent } from "~/src/presentation/components/custom/pages/admin/catalog/catalog-form-sheet-content"
import { AvailabilitySection } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/_sections/availability-section"
import { DetailsSection } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/_sections/details-section"
import { DiscountSection } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/_sections/discount-section"
import { LimitsSection } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/_sections/limits-section"
import {
  CouponForm,
  type CouponFormMode,
  CouponFormProvider,
} from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-form-provider"
import { CouponSheetFooter } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-sheet-footer"

export const CouponSheet = ({ coupon, mode, onOpenChange, open }: Readonly<CouponSheetProps>): JSX.Element => {
  const t = useTranslations("pages.admin.coupons.form")
  const close = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <CatalogFormSheetContent>
        <CouponFormProvider coupon={coupon} mode={mode} onClose={close}>
          <SheetHeader className="shrink-0 space-y-1 border-b border-border px-6 py-5 pr-14">
            <SheetTitle className="text-base font-semibold tracking-tight">
              {mode === "create" ? t("createTitle") : t("editTitle")}
            </SheetTitle>
            <SheetDescription className="max-w-md text-[13px] leading-relaxed text-muted-foreground">
              {mode === "create" ? t("createDescription") : t("editDescription")}
            </SheetDescription>
          </SheetHeader>
          <CouponForm>
            <div className="space-y-10 px-6 py-6">
              <DetailsSection />
              <DiscountSection />
              <LimitsSection />
              <AvailabilitySection />
            </div>
          </CouponForm>
          <CouponSheetFooter />
        </CouponFormProvider>
      </CatalogFormSheetContent>
    </Sheet>
  )
}

interface CouponSheetProps {
  readonly coupon: Discount["adminListItem"] | undefined
  readonly mode: CouponFormMode
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
}
