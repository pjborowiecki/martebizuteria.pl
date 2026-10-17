import { type JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"

import { listAdminTeamQuery } from "~/src/modules/user/use-cases/list-admin-team"

import { SettingsPageLayout } from "~/src/presentation/components/custom/pages/admin/settings/settings-page-layout"
import { SettingsTeamCard } from "~/src/presentation/components/custom/pages/admin/settings/team/settings-team-card"
import { SettingsTeamRulesCard } from "~/src/presentation/components/custom/pages/admin/settings/team/settings-team-rules-card"

const AdminSettingsTeamRoute = (): JSX.Element => (
  <SettingsPageLayout active="team">
    <SettingsTeamCard />
    <SettingsTeamRulesCard />
  </SettingsPageLayout>
)

export const Route = createFileRoute("/admin/settings/team")({
  component: AdminSettingsTeamRoute,
  loader: async ({ context }) => {
    await context.queryClient.query(listAdminTeamQuery())
  },
})
