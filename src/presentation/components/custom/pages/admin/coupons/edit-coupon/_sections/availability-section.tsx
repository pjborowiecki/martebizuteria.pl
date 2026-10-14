import { type JSX, useCallback, useMemo } from "react"

import { CalendarClock } from "lucide-react"
import { useController } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { DISCOUNT_STATUS } from "~/src/modules/discount/discount.constants"

import { Field } from "~/src/presentation/components/shadcn/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import { CouponDateTimeField } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-form-fields"
import { useCouponForm } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-form-provider"
import { CouponFormSection } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-form-section"

export const AvailabilitySection = (): JSX.Element => {
  const t = useTranslations("pages.admin.coupons.form")
  const tCoupons = useTranslations("pages.admin.coupons")
  const { control, isPending } = useCouponForm()
  const { field } = useController({ control, name: "isActive" })
  const statusOptions = useMemo(
    () => [
      { label: tCoupons("status.active"), value: DISCOUNT_STATUS.ACTIVE },
      { label: tCoupons("status.disabled"), value: DISCOUNT_STATUS.DISABLED },
    ],
    [tCoupons],
  )

  const handleStatusChange = useCallback(
    (value: string | null) => {
      if (value !== null) {
        field.onChange(value === DISCOUNT_STATUS.ACTIVE)
      }
    },
    [field],
  )

  return (
    <CouponFormSection description={t("sections.availabilityDescription")} icon={CalendarClock} title={t("sections.availability")}>
      <Field className="gap-2">
        <CatalogFormFieldLabel hint={t("statusHint")} label={t("status")} required />
        <Select
          disabled={isPending}
          items={statusOptions}
          onValueChange={handleStatusChange}
          value={field.value === false ? DISCOUNT_STATUS.DISABLED : DISCOUNT_STATUS.ACTIVE}
        >
          <SelectTrigger aria-label={t("status")} size="sheet">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <CouponDateTimeField label={t("startsAt")} name="startsAt" />
        <CouponDateTimeField label={t("endsAt")} name="endsAt" />
      </div>
    </CouponFormSection>
  )
}
