import { type JSX } from "react"

import { useTranslations } from "use-intl"

import { ADMIN_CUSTOMER_BOOLEAN_LABEL_KEYS } from "~/src/modules/user/user.constants"

import { CatalogStatusBadge } from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-status-badge"
export const CustomerBannedBadge = ({
  banned,
}: Readonly<{
  banned: boolean
}>): JSX.Element => {
  const t = useTranslations("pages.admin.customers")
  return (
    <CatalogStatusBadge
      isActive={!banned}
      label={t(banned ? ADMIN_CUSTOMER_BOOLEAN_LABEL_KEYS.yes : ADMIN_CUSTOMER_BOOLEAN_LABEL_KEYS.no)}
    />
  )
}
