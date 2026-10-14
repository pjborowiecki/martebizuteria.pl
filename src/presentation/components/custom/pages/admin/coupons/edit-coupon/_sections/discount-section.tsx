import { type JSX, useCallback, useMemo } from "react"

import { BadgePercent } from "lucide-react"
import { useController } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { DISCOUNT_TYPE, DISCOUNT_TYPES } from "~/src/modules/discount/discount.constants"

import { Field } from "~/src/presentation/components/shadcn/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import {
  CouponIntegerField,
  CouponMoneyField,
} from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-form-fields"
import { useCouponForm } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-form-provider"
import { CouponFormSection } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-form-section"

const CouponValueField = ({ type }: Readonly<{ type: (typeof DISCOUNT_TYPES)[number] }>): JSX.Element => {
  const t = useTranslations("pages.admin.coupons.form")
  if (type === DISCOUNT_TYPE.FREE_SHIPPING) {
    return <p className="text-[13px] leading-relaxed text-muted-foreground">{t("freeShippingNote")}</p>
  }

  if (type === DISCOUNT_TYPE.PERCENTAGE) {
    return <CouponIntegerField label={t("percentageValue")} name="value" required suffix="%" />
  }

  return <CouponMoneyField label={t("amountValue")} name="value" required />
}

export const DiscountSection = (): JSX.Element => {
  const t = useTranslations("pages.admin.coupons.form")
  const tCoupons = useTranslations("pages.admin.coupons")
  const { clearErrors, control, isPending, setValue } = useCouponForm()
  const { field: typeField } = useController({ control, name: "type" })
  const typeOptions = useMemo(
    () =>
      DISCOUNT_TYPES.map((type) => ({
        label: tCoupons(`type.${type}`),
        value: type,
      })),
    [tCoupons],
  )

  const handleTypeChange = useCallback(
    (value: string | null) => {
      const next = DISCOUNT_TYPES.find((type) => type === value)
      if (next === undefined || next === typeField.value) {
        return
      }

      typeField.onChange(next)
      setValue("value", 0)
      clearErrors("value")
    },
    [clearErrors, setValue, typeField],
  )

  return (
    <CouponFormSection description={t("sections.discountDescription")} icon={BadgePercent} title={t("sections.discount")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="gap-2">
          <CatalogFormFieldLabel label={t("type")} required />
          <Select disabled={isPending} items={typeOptions} onValueChange={handleTypeChange} value={typeField.value}>
            <SelectTrigger aria-label={t("type")} size="sheet">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <CouponValueField type={typeField.value} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {typeField.value === DISCOUNT_TYPE.PERCENTAGE && (
          <CouponMoneyField hint={t("maxDiscountAmountHint")} label={t("maxDiscountAmount")} name="maxDiscountAmount" />
        )}
        <CouponMoneyField hint={t("minOrderTotalHint")} label={t("minOrderTotal")} name="minOrderTotal" />
      </div>
    </CouponFormSection>
  )
}
