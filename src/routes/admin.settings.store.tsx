import { createFileRoute } from "@tanstack/react-router"

import { getAdminSellerDetailsQuery } from "~/src/modules/store-setting/use-cases/get-seller-details"

import { SettingsStorePage } from "~/src/presentation/components/custom/pages/admin/settings/store/settings-store-page"

export const Route = createFileRoute("/admin/settings/store")({
  component: SettingsStorePage,
  loader: async ({ context }) => {
    await context.queryClient.query(getAdminSellerDetailsQuery())
  },
})
