import { type JSX } from "react"

import { NotebookPen } from "lucide-react"
import { useController } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { ADMIN_CUSTOMER_FORM_FIELD_MAX } from "~/src/modules/user/user.constants"

import { Field } from "~/src/presentation/components/shadcn/field"
import { InputGroup, InputGroupTextarea } from "~/src/presentation/components/shadcn/input-group"

import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import { catalogFieldStringValue } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.utils"
import { useCustomerForm } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-form-provider"
import { CustomerFormSection } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-form-section"

export const NotesSection = (): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail.form")
  const { control, isPending } = useCustomerForm()
  const { field: notesField } = useController({
    control,
    name: "notes",
  })

  const notesValue = catalogFieldStringValue(notesField.value)

  return (
    <CustomerFormSection icon={NotebookPen} title={t("sections.notes")}>
      <Field className="gap-2">
        <CatalogFormFieldLabel
          counter={`${notesValue.length}/${ADMIN_CUSTOMER_FORM_FIELD_MAX.NOTES}`}
          hint={t("hints.notes")}
          label={t("notes")}
        />
        <InputGroup variant="sheet">
          <InputGroupTextarea
            {...notesField}
            placeholder={t("notesPlaceholder")}
            disabled={isPending}
            maxLength={ADMIN_CUSTOMER_FORM_FIELD_MAX.NOTES}
            rows={5}
            value={notesValue}
          />
        </InputGroup>
      </Field>
    </CustomerFormSection>
  )
}
