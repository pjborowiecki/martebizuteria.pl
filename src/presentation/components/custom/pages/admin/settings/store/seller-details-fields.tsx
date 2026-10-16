import { type JSX, useId, useMemo } from "react"

import { cn } from "cn"
import { useLocale, useTranslations } from "use-intl/react"

import { COUNTRIES } from "~/src/modules/_core/constants/country"
import { formatCountryName } from "~/src/modules/_core/utils/country-name"
import { type SellerDetailsField } from "~/src/modules/store-setting/store-setting.constants"
import { type StoreSetting } from "~/src/modules/store-setting/store-setting.types"

import { sheetSelectTriggerClassName } from "~/src/presentation/components/shadcn/_styles/sheet-control.styles"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Label } from "~/src/presentation/components/shadcn/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { ADMIN_DIALOG_LABEL_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { type SellerDetailsFieldErrors } from "~/src/presentation/components/custom/pages/admin/settings/store/seller-details-form.utils"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const VALIDATION_NAMESPACE = "pages.admin.settings.store.sellerDetails.validation"

const NAME_AND_ADDRESS_FIELDS = [
  { field: "legalName", hint: "legalNameHint", wide: true },
  { field: "street", wide: true },
  { field: "postalCode" },
  { field: "city" },
] as const satisfies readonly TextFieldSpec[]

const NUMBER_AND_CONTACT_FIELDS = [
  { field: "nip", inputMode: "numeric" },
  { field: "regon", inputMode: "numeric" },
  { field: "email", hint: "emailHint", type: "email" },
  { field: "phone", hint: "phoneHint", type: "tel" },
] as const satisfies readonly TextFieldSpec[]

const SellerDetailsTextField = ({ error, onChange, spec, value }: Readonly<SellerDetailsTextFieldProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.store.sellerDetails")
  const id = useId()

  return (
    <div className={cn("space-y-2", spec.wide === true && "sm:col-span-2")}>
      <Label className={ADMIN_DIALOG_LABEL_CLASS} htmlFor={id}>
        {t(spec.field)}
      </Label>
      <Input
        aria-invalid={error !== undefined}
        id={id}
        inputMode={spec.inputMode}
        onChange={(event) => {
          onChange({ [spec.field]: event.target.value })
        }}
        type={spec.type}
        value={value}
        variant="sheet"
      />
      {spec.hint !== undefined && <p className="text-[12px] text-muted-foreground">{t(spec.hint)}</p>}
      <ValidationFieldError message={error} namespace={VALIDATION_NAMESPACE} />
    </div>
  )
}

const CountryField = ({ error, onChange, value }: Readonly<CountryFieldProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.store.sellerDetails")
  const locale = useLocale()
  const id = useId()
  const items = useMemo(
    () =>
      COUNTRIES.map(({ alpha2 }) => ({ label: formatCountryName(alpha2, locale), value: alpha2 })).toSorted((left, right) =>
        left.label.localeCompare(right.label, locale),
      ),
    [locale],
  )

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label className={ADMIN_DIALOG_LABEL_CLASS} htmlFor={id}>
        {t("country")}
      </Label>
      <Select
        items={items}
        onValueChange={(countryCode) => {
          if (typeof countryCode === "string" && countryCode !== value) {
            onChange({ countryCode })
          }
        }}
        value={value}
      >
        <SelectTrigger aria-invalid={error !== undefined} className={sheetSelectTriggerClassName} id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ValidationFieldError message={error} namespace={VALIDATION_NAMESPACE} />
    </div>
  )
}

export const SellerDetailsFields = ({ errors, onChange, values }: Readonly<SellerDetailsFieldsProps>): JSX.Element => (
  <div className="grid gap-4 sm:grid-cols-2">
    {NAME_AND_ADDRESS_FIELDS.map((spec) => (
      <SellerDetailsTextField error={errors[spec.field]} key={spec.field} onChange={onChange} spec={spec} value={values[spec.field]} />
    ))}
    <CountryField error={errors.countryCode} onChange={onChange} value={values.countryCode} />
    {NUMBER_AND_CONTACT_FIELDS.map((spec) => (
      <SellerDetailsTextField error={errors[spec.field]} key={spec.field} onChange={onChange} spec={spec} value={values[spec.field]} />
    ))}
  </div>
)

interface TextFieldSpec {
  readonly field: Exclude<SellerDetailsField, "countryCode">
  readonly hint?: "emailHint" | "legalNameHint" | "phoneHint"
  readonly inputMode?: "numeric"
  readonly type?: "email" | "tel"
  readonly wide?: boolean
}

interface SellerDetailsTextFieldProps {
  readonly error: string | undefined
  readonly onChange: (patch: Partial<StoreSetting["sellerDetails"]>) => void
  readonly spec: TextFieldSpec
  readonly value: string
}

interface CountryFieldProps {
  readonly error: string | undefined
  readonly onChange: (patch: Partial<StoreSetting["sellerDetails"]>) => void
  readonly value: string
}

interface SellerDetailsFieldsProps {
  readonly errors: SellerDetailsFieldErrors
  readonly onChange: (patch: Partial<StoreSetting["sellerDetails"]>) => void
  readonly values: StoreSetting["sellerDetails"]
}
