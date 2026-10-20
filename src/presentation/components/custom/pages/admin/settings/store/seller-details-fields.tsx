import { type JSX, useMemo } from "react"

import { cn } from "cn"
import { useLocale, useTranslations } from "use-intl/react"

import { COUNTRIES } from "~/src/modules/_core/constants/country"
import { formatCountryName } from "~/src/modules/_core/utils/country-name"
import { SELLER_DETAILS_MAX_LENGTH, type SellerDetailsField } from "~/src/modules/store-setting/store-setting.constants"
import { type StoreSetting } from "~/src/modules/store-setting/store-setting.types"

import { Field } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
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

const fieldMaxLength = (field: TextFieldSpec["field"]): number | undefined =>
  field === "nip" || field === "regon" ? undefined : SELLER_DETAILS_MAX_LENGTH[field]

const SellerDetailsTextField = ({
  disabled,
  error,
  onChange,
  senderAddress,
  spec,
  value,
}: Readonly<SellerDetailsTextFieldProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.store.sellerDetails")
  const maxLength = fieldMaxLength(spec.field)
  const hint = spec.hint === "emailHint" ? t("emailHint", { sender: senderAddress }) : spec.hint && t(spec.hint)

  return (
    <Field className={cn("gap-2", spec.wide === true && "sm:col-span-2")} data-invalid={error !== undefined}>
      <CatalogFormFieldLabel
        counter={maxLength === undefined ? undefined : `${String(value.length)}/${String(maxLength)}`}
        hint={hint}
        label={t(spec.field)}
        required
      />
      <Input
        aria-invalid={error !== undefined}
        aria-label={t(spec.field)}
        disabled={disabled}
        inputMode={spec.inputMode}
        maxLength={maxLength}
        onChange={(event) => {
          onChange({ [spec.field]: event.target.value })
        }}
        type={spec.type}
        value={value}
        variant="sheet"
      />
      <ValidationFieldError message={error} namespace={VALIDATION_NAMESPACE} />
    </Field>
  )
}

const CountryField = ({ disabled, error, onChange, value }: Readonly<CountryFieldProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.store.sellerDetails")
  const locale = useLocale()
  const items = useMemo(
    () =>
      COUNTRIES.map(({ alpha2 }) => ({ label: formatCountryName(alpha2, locale), value: alpha2 })).toSorted((left, right) =>
        left.label.localeCompare(right.label, locale),
      ),
    [locale],
  )

  return (
    <Field className="gap-2 sm:col-span-2" data-invalid={error !== undefined}>
      <CatalogFormFieldLabel label={t("country")} required />
      <Select
        disabled={disabled}
        items={items}
        onValueChange={(countryCode) => {
          if (typeof countryCode === "string" && countryCode !== value) {
            onChange({ countryCode })
          }
        }}
        value={value}
      >
        <SelectTrigger aria-invalid={error !== undefined} aria-label={t("country")} size="sheet">
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
    </Field>
  )
}

export const SellerDetailsFields = ({
  disabled,
  errors,
  onChange,
  senderAddress,
  values,
}: Readonly<SellerDetailsFieldsProps>): JSX.Element => (
  <div className="grid gap-5 sm:grid-cols-2">
    {NAME_AND_ADDRESS_FIELDS.map((spec) => (
      <SellerDetailsTextField
        disabled={disabled}
        error={errors[spec.field]}
        key={spec.field}
        onChange={onChange}
        senderAddress={senderAddress}
        spec={spec}
        value={values[spec.field]}
      />
    ))}
    <CountryField disabled={disabled} error={errors.countryCode} onChange={onChange} value={values.countryCode} />
    {NUMBER_AND_CONTACT_FIELDS.map((spec) => (
      <SellerDetailsTextField
        disabled={disabled}
        error={errors[spec.field]}
        key={spec.field}
        onChange={onChange}
        senderAddress={senderAddress}
        spec={spec}
        value={values[spec.field]}
      />
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
  readonly disabled: boolean
  readonly error: string | undefined
  readonly onChange: (patch: Partial<StoreSetting["sellerDetails"]>) => void
  readonly senderAddress: string
  readonly spec: TextFieldSpec
  readonly value: string
}

interface CountryFieldProps {
  readonly disabled: boolean
  readonly error: string | undefined
  readonly onChange: (patch: Partial<StoreSetting["sellerDetails"]>) => void
  readonly value: string
}

interface SellerDetailsFieldsProps {
  readonly disabled: boolean
  readonly errors: SellerDetailsFieldErrors
  readonly onChange: (patch: Partial<StoreSetting["sellerDetails"]>) => void
  readonly senderAddress: string
  readonly values: StoreSetting["sellerDetails"]
}
