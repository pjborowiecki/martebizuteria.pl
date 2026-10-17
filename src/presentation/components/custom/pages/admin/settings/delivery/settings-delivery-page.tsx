import { type JSX, useState } from "react"

import { Gift } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"

import { ADMIN_HEADER_SECONDARY_BUTTON_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { DeliveryMethodsTable } from "~/src/presentation/components/custom/pages/admin/settings/delivery/components/delivery-methods-table"
import { FreeDeliverySheet } from "~/src/presentation/components/custom/pages/admin/settings/delivery/free-delivery-sheet"
import { SettingsPageLayout } from "~/src/presentation/components/custom/pages/admin/settings/settings-page-layout"

export const SettingsDeliveryPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.delivery")
  const [freeDeliveryOpen, setFreeDeliveryOpen] = useState(false)

  return (
    <SettingsPageLayout
      actions={
        <Button
          className={ADMIN_HEADER_SECONDARY_BUTTON_CLASS}
          onClick={() => {
            setFreeDeliveryOpen(true)
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          <Gift className="size-3.5" strokeWidth={1.5} />
          {t("actions.freeDelivery")}
        </Button>
      }
      active="delivery"
      body="grid"
    >
      <DeliveryMethodsTable />
      {freeDeliveryOpen && (
        <FreeDeliverySheet
          onClose={() => {
            setFreeDeliveryOpen(false)
          }}
        />
      )}
    </SettingsPageLayout>
  )
}
