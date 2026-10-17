import { type JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"

import { listAdminTeamQuery } from "~/src/modules/user/use-cases/list-admin-team"

import { SettingsPageLayout } from "~/src/presentation/components/custom/pages/admin/settings/settings-page-layout"
import { TeamTable } from "~/src/presentation/components/custom/pages/admin/settings/team/components/team-table"

const AdminSettingsTeamRoute = (): JSX.Element => (
  <SettingsPageLayout active="team" body="grid">
    <TeamTable />
  </SettingsPageLayout>
)

export const Route = createFileRoute("/admin/settings/team")({
  component: AdminSettingsTeamRoute,
  loader: async ({ context }) => {
    await context.queryClient.query(listAdminTeamQuery())
  },
})
