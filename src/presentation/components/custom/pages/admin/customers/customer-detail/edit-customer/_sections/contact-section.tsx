import { type JSX } from "react"

import { Info } from "lucide-react"
import { useController } from "react-hook-form"
import { useTranslations } from "use-intl"

import { ADMIN_CUSTOMER_FORM_FIELD_MAX } from "~/src/modules/user/user.constants"

import { Field } from "~/src/presentation/components/shadcn/field"
import { InputGroup, InputGroupInput } from "~/src/presentation/components/shadcn/input-group"

import { CatalogFormFieldError } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-error"
import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import { CatalogFormReadOnlyField } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-read-only-field"
import { catalogFieldStringValue } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.utils"
import { useCustomerForm } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-form-provider"
import { CustomerFormSection } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-form-section"
export const ContactSection = (): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail.form")
  const { control, customer, isPending } = useCustomerForm()
  const { field: phoneField, fieldState: phoneFieldState } = useController({
    control,
    name: "phone",
  })
  const phoneValue = catalogFieldStringValue(phoneField.value)
  return (
    <CustomerFormSection icon={Info} title={t("sections.contact")}>
      <CatalogFormReadOnlyField hint={t("hints.id")} label={t("id")} value={customer.id} />
      <CatalogFormReadOnlyField hint={t("hints.name")} label={t("name")} value={customer.name} />
      <CatalogFormReadOnlyField hint={t("hints.email")} label={t("email")} value={customer.email} />
      <Field className="gap-2">
        <CatalogFormFieldLabel
          counter={`${phoneValue.length}/${ADMIN_CUSTOMER_FORM_FIELD_MAX.PHONE}`}
          hint={t("hints.phone")}
          label={t("phone")}
        />
        <InputGroup variant="sheet">
          <InputGroupInput
            {...phoneField}
            placeholder={t("phonePlaceholder")}
            disabled={isPending}
            maxLength={ADMIN_CUSTOMER_FORM_FIELD_MAX.PHONE}
            value={phoneValue}
          />
        </InputGroup>
        <CatalogFormFieldError fieldState={phoneFieldState} />
      </Field>
    </CustomerFormSection>
  )
}
