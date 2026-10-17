import { type JSX, useMemo, useState } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { listAdminTeamQuery } from "~/src/modules/user/use-cases/list-admin-team"

import { DataGridShell } from "~/src/presentation/components/custom/datagrid/components/data-grid-shell"
import { ADMIN_CATALOG_DATAGRID_PAGE_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { CatalogToolbarAddButton } from "~/src/presentation/components/custom/pages/admin/catalog/toolbar/components/catalog-toolbar-add-button"
import { AddAdminSheet } from "~/src/presentation/components/custom/pages/admin/settings/team/add-admin-sheet"
import { TeamRefreshAction } from "~/src/presentation/components/custom/pages/admin/settings/team/components/team-refresh-action"
import { TeamStats } from "~/src/presentation/components/custom/pages/admin/settings/team/components/team-stats"
import { useTeamDataGrid } from "~/src/presentation/components/custom/pages/admin/settings/team/hooks/use-team-data-grid"
import { SignInAgainButton } from "~/src/presentation/components/custom/pages/admin/settings/team/sign-in-again-button"
import { teamDataGrid } from "~/src/presentation/components/custom/pages/admin/settings/team/utils/team-data-grid"

const RecentSignInNotice = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.team.admins")

  return (
    <div
      className="flex shrink-0 flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <p className="flex items-start gap-2.5 text-[13px] leading-snug text-foreground">
        <TriangleAlert aria-hidden className="mt-px size-4 shrink-0 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
        {t("recentSignInNeeded")}
      </p>
      <SignInAgainButton />
    </div>
  )
}

export const TeamTable = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.team.admins")
  const { data: team } = useSuspenseQuery(listAdminTeamQuery())
  const grid = useTeamDataGrid()
  const [adding, setAdding] = useState(false)
  const toolbarActions = useMemo(
    () => (
      <CatalogToolbarAddButton
        disabled={!team.recentSignIn}
        onClick={() => {
          setAdding(true)
        }}
      >
        {t("add")}
      </CatalogToolbarAddButton>
    ),
    [t, team.recentSignIn],
  )

  return (
    <>
      <Provider value={grid}>
        <div className={ADMIN_CATALOG_DATAGRID_PAGE_CLASS}>
          <TeamStats />
          {!team.recentSignIn && <RecentSignInNotice />}
          <DataGridShell>
            <Toolbar actions={toolbarActions}>
              <TeamRefreshAction />
              <Export />
            </Toolbar>
            <Body />
            <Pagination />
          </DataGridShell>
        </div>
      </Provider>

      {adding && (
        <AddAdminSheet
          onClose={() => {
            setAdding(false)
          }}
        />
      )}
    </>
  )
}

const { Body, Export, Pagination, Provider, Toolbar } = teamDataGrid
