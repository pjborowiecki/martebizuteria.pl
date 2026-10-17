import { type ChangeEvent, type JSX, useCallback } from "react"

import { cn } from "cn"
import { useController } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { formatMinorUnitsToMoneyInput, parseMoneyInputToMinorUnits } from "~/src/modules/_core/utils/currency"

import { useDisplayTimeZone, useFormatLocale } from "~/src/hooks/use-display-format"

import { Field } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { CatalogFormFieldError } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-error"
import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import { CatalogIntegerFilterInput } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-integer-filter-input"
import { CatalogMoneyInput } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-money-input"
import { useCouponForm } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-form-provider"
import {
  COUPON_FORM_VALIDATION_KEYS,
  toIsoOrUndefined,
  toLocalInputValue,
} from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-form.utils"

const toDisplayValue = (value: number | undefined, required: boolean, format: (value: number) => string): string =>
  value === undefined || (required && value === 0) ? "" : format(value)

export const CouponMoneyField = ({ hint, label, name, required = false }: Readonly<CouponNumberFieldProps>): JSX.Element => {
  const t = useTranslations("pages.admin.coupons")
  const formatLocale = useFormatLocale()
  const { control } = useCouponForm()
  const { field, fieldState } = useController({ control, name })
  const blankValue = required ? 0 : undefined
  const handleChange = useCallback(
    (next: string) => {
      field.onChange(next === "" ? blankValue : (parseMoneyInputToMinorUnits(next, STORE_CURRENCY_CODE, formatLocale) ?? blankValue))
    },
    [blankValue, field, formatLocale],
  )

  return (
    <Field className="gap-2" data-invalid={fieldState.invalid}>
      <CatalogFormFieldLabel hint={hint} label={label} required={required} />
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-sm text-muted-foreground/40">
          {STORE_CURRENCY_CODE}
        </span>
        <CatalogMoneyInput
          aria-label={label}
          ariaInvalid={fieldState.invalid}
          className="pl-12"
          onValueChange={handleChange}
          value={toDisplayValue(field.value, required, (amount) => formatMinorUnitsToMoneyInput(amount, STORE_CURRENCY_CODE, formatLocale))}
        />
      </div>
      <CatalogFormFieldError fieldState={fieldState} translate={t} validationKeySet={COUPON_FORM_VALIDATION_KEYS} />
    </Field>
  )
}

export const CouponIntegerField = ({ hint, label, name, required = false, suffix }: Readonly<CouponIntegerFieldProps>): JSX.Element => {
  const t = useTranslations("pages.admin.coupons")
  const { control } = useCouponForm()
  const { field, fieldState } = useController({ control, name })
  const blankValue = required ? 0 : undefined
  const handleChange = useCallback(
    (next: string) => {
      field.onChange(next === "" ? blankValue : Number(next))
    },
    [blankValue, field],
  )

  return (
    <Field className="gap-2" data-invalid={fieldState.invalid}>
      <CatalogFormFieldLabel hint={hint} label={label} required={required} />
      <div className="relative">
        <CatalogIntegerFilterInput
          aria-label={label}
          className={cn(suffix !== undefined && "pr-9")}
          onValueChange={handleChange}
          placeholder=""
          value={toDisplayValue(field.value, required, String)}
        />
        {suffix !== undefined && (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground/60">{suffix}</span>
        )}
      </div>
      <CatalogFormFieldError fieldState={fieldState} translate={t} validationKeySet={COUPON_FORM_VALIDATION_KEYS} />
    </Field>
  )
}

export const CouponDateTimeField = ({ label, name }: Readonly<CouponDateTimeFieldProps>): JSX.Element => {
  const t = useTranslations("pages.admin.coupons")
  const timeZone = useDisplayTimeZone()
  const { control, isPending } = useCouponForm()
  const { field, fieldState } = useController({ control, name })
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      field.onChange(toIsoOrUndefined(event.target.value, timeZone))
    },
    [field, timeZone],
  )

  return (
    <Field className="gap-2" data-invalid={fieldState.invalid}>
      <CatalogFormFieldLabel label={label} />
      <Input
        aria-invalid={fieldState.invalid}
        aria-label={label}
        disabled={isPending}
        name={field.name}
        onBlur={field.onBlur}
        onChange={handleChange}
        ref={field.ref}
        type="datetime-local"
        value={toLocalInputValue(field.value, timeZone)}
        variant="sheet"
      />
      <CatalogFormFieldError fieldState={fieldState} translate={t} validationKeySet={COUPON_FORM_VALIDATION_KEYS} />
    </Field>
  )
}

interface CouponNumberFieldProps {
  readonly hint?: string | undefined
  readonly label: string
  readonly name: "maxDiscountAmount" | "minOrderTotal" | "perCustomerLimit" | "usageLimit" | "value"
  readonly required?: boolean
}

interface CouponIntegerFieldProps extends CouponNumberFieldProps {
  readonly suffix?: string
}

interface CouponDateTimeFieldProps {
  readonly label: string
  readonly name: "endsAt" | "startsAt"
}
