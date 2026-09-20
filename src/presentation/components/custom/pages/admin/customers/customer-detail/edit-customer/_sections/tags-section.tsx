import { type JSX } from "react"

import { Tags } from "lucide-react"
import { useTranslations } from "use-intl"

import { CustomerFormSection } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-form-section"
import { CustomerTagsField } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-tags-field"
export const TagsSection = (): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail.form")
  return (
    <CustomerFormSection description={t("sections.tagsDescription")} icon={Tags} title={t("sections.tags")}>
      <CustomerTagsField />
    </CustomerFormSection>
  )
}
