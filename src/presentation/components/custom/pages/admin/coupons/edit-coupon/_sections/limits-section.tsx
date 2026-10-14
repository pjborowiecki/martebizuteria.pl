import { type JSX } from "react"

import { Gauge } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { CouponIntegerField } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-form-fields"
import { CouponFormSection } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-form-section"

export const LimitsSection = (): JSX.Element => {
  const t = useTranslations("pages.admin.coupons.form")

  return (
    <CouponFormSection description={t("sections.limitsDescription")} icon={Gauge} title={t("sections.limits")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <CouponIntegerField hint={t("usageLimitHint")} label={t("usageLimit")} name="usageLimit" />
        <CouponIntegerField hint={t("perCustomerLimitHint")} label={t("perCustomerLimit")} name="perCustomerLimit" />
      </div>
    </CouponFormSection>
  )
}
