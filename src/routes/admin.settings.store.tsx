import { createFileRoute } from "@tanstack/react-router"

import { getShopSenderQuery } from "~/src/integrations/resend/resend.shop-sender"

import { getAdminSellerDetailsQuery } from "~/src/modules/store-setting/use-cases/get-seller-details"

import { SettingsStorePage } from "~/src/presentation/components/custom/pages/admin/settings/store/settings-store-page"

export const Route = createFileRoute("/admin/settings/store")({
  component: SettingsStorePage,
  loader: async ({ context }) => {
    await Promise.all([context.queryClient.query(getAdminSellerDetailsQuery()), context.queryClient.query(getShopSenderQuery())])
  },
})
