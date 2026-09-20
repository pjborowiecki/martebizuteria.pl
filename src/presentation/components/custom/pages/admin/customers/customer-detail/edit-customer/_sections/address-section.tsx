import { type ChangeEvent, type JSX, useCallback } from "react"

import { MapPin } from "lucide-react"
import { useController } from "react-hook-form"
import { useTranslations } from "use-intl"

import { ADMIN_CUSTOMER_FORM_FIELD_MAX } from "~/src/modules/user/user.constants"

import { Field } from "~/src/presentation/components/shadcn/field"
import { InputGroup, InputGroupInput } from "~/src/presentation/components/shadcn/input-group"

import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import { catalogFieldStringValue } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.utils"
import { useCustomerForm } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-form-provider"
import { CustomerFormSection } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-form-section"
export const AddressSection = (): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail.form")
  const { control, isPending } = useCustomerForm()
  const { field: address1Field } = useController({
    control,
    name: "address.address1",
  })
  const { field: address2Field } = useController({
    control,
    name: "address.address2",
  })
  const { field: cityField } = useController({
    control,
    name: "address.city",
  })
  const { field: provinceField } = useController({
    control,
    name: "address.province",
  })
  const { field: postalCodeField } = useController({
    control,
    name: "address.postalCode",
  })
  const { field: countryCodeField } = useController({
    control,
    name: "address.countryCode",
  })
  const address1Value = catalogFieldStringValue(address1Field.value)
  const address2Value = catalogFieldStringValue(address2Field.value)
  const cityValue = catalogFieldStringValue(cityField.value)
  const provinceValue = catalogFieldStringValue(provinceField.value)
  const postalCodeValue = catalogFieldStringValue(postalCodeField.value)
  const countryCodeValue = catalogFieldStringValue(countryCodeField.value)
  const handleCountryCodeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      countryCodeField.onChange(event.target.value.toUpperCase())
    },
    [countryCodeField],
  )
  return (
    <CustomerFormSection description={t("sections.addressDescription")} icon={MapPin} title={t("sections.address")}>
      <Field className="gap-2">
        <CatalogFormFieldLabel
          counter={`${address1Value.length}/${ADMIN_CUSTOMER_FORM_FIELD_MAX.ADDRESS_LINE}`}
          hint={t("hints.address1")}
          label={t("address1")}
        />
        <InputGroup variant="sheet">
          <InputGroupInput
            {...address1Field}
            placeholder={t("address1Placeholder")}
            disabled={isPending}
            maxLength={ADMIN_CUSTOMER_FORM_FIELD_MAX.ADDRESS_LINE}
            value={address1Value}
          />
        </InputGroup>
      </Field>
      <Field className="gap-2">
        <CatalogFormFieldLabel
          counter={`${address2Value.length}/${ADMIN_CUSTOMER_FORM_FIELD_MAX.ADDRESS_LINE}`}
          hint={t("hints.address2")}
          label={t("address2")}
        />
        <InputGroup variant="sheet">
          <InputGroupInput
            {...address2Field}
            placeholder={t("address2Placeholder")}
            disabled={isPending}
            maxLength={ADMIN_CUSTOMER_FORM_FIELD_MAX.ADDRESS_LINE}
            value={address2Value}
          />
        </InputGroup>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="gap-2">
          <CatalogFormFieldLabel
            counter={`${cityValue.length}/${ADMIN_CUSTOMER_FORM_FIELD_MAX.CITY}`}
            hint={t("hints.city")}
            label={t("city")}
          />
          <InputGroup variant="sheet">
            <InputGroupInput
              {...cityField}
              placeholder={t("cityPlaceholder")}
              disabled={isPending}
              maxLength={ADMIN_CUSTOMER_FORM_FIELD_MAX.CITY}
              value={cityValue}
            />
          </InputGroup>
        </Field>
        <Field className="gap-2">
          <CatalogFormFieldLabel
            counter={`${provinceValue.length}/${ADMIN_CUSTOMER_FORM_FIELD_MAX.PROVINCE}`}
            hint={t("hints.province")}
            label={t("province")}
          />
          <InputGroup variant="sheet">
            <InputGroupInput
              {...provinceField}
              placeholder={t("provincePlaceholder")}
              disabled={isPending}
              maxLength={ADMIN_CUSTOMER_FORM_FIELD_MAX.PROVINCE}
              value={provinceValue}
            />
          </InputGroup>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="gap-2">
          <CatalogFormFieldLabel
            counter={`${postalCodeValue.length}/${ADMIN_CUSTOMER_FORM_FIELD_MAX.POSTAL_CODE}`}
            hint={t("hints.postalCode")}
            label={t("postalCode")}
          />
          <InputGroup variant="sheet">
            <InputGroupInput
              {...postalCodeField}
              placeholder={t("postalCodePlaceholder")}
              disabled={isPending}
              maxLength={ADMIN_CUSTOMER_FORM_FIELD_MAX.POSTAL_CODE}
              value={postalCodeValue}
            />
          </InputGroup>
        </Field>
        <Field className="gap-2">
          <CatalogFormFieldLabel
            counter={`${countryCodeValue.length}/${ADMIN_CUSTOMER_FORM_FIELD_MAX.COUNTRY_CODE}`}
            hint={t("hints.countryCode")}
            label={t("countryCode")}
          />
          <InputGroup variant="sheet">
            <InputGroupInput
              {...countryCodeField}
              placeholder={t("countryCodePlaceholder")}
              disabled={isPending}
              maxLength={COUNTRY_CODE_LENGTH}
              value={countryCodeValue}
              onChange={handleCountryCodeChange}
            />
          </InputGroup>
        </Field>
      </div>
    </CustomerFormSection>
  )
}
const COUNTRY_CODE_LENGTH = ADMIN_CUSTOMER_FORM_FIELD_MAX.COUNTRY_CODE
