import { useCallback, useMemo, useState } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { listAdminTeamQuery } from "~/src/modules/user/use-cases/list-admin-team"
import { ADMIN_TEAM_PAGE_SIZE, TEAM_TABLE_COLUMN_PINNING, type TeamStatFilter } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

import { useFormatter } from "~/src/hooks/use-display-format"

import { useDataGridInstance } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-instance"
import { createCatalogTableGlobalFilterFn } from "~/src/presentation/components/custom/datagrid/lib/catalog-table-global-filter"
import { type DataGridExportSource, exportFilter } from "~/src/presentation/components/custom/datagrid/lib/data-grid-export"
import { type DataGridContextValue } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { getDataGridColumnIds } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import {
  teamSignInMethods,
  teamTwoFactorLabel,
  useTeamColumns,
} from "~/src/presentation/components/custom/pages/admin/settings/team/components/team-columns"
import { TEAM_STAT_CARDS, matchesTeamStatFilter } from "~/src/presentation/components/custom/pages/admin/settings/team/team-stats.config"
import { teamDataGrid } from "~/src/presentation/components/custom/pages/admin/settings/team/utils/team-data-grid"

export const TEAM_EXPORT_LIST = "admins"

export const useTeamDataGrid = (): TeamDataGridValue => {
  const t = useTranslations("pages.admin.settings.team")
  const tGrid = useTranslations("components.datagrid")
  const format = useFormatter()
  const { data, isFetching } = useSuspenseQuery(listAdminTeamQuery())
  const [statFilter, setStatFilter] = useState<TeamStatFilter>()
  const members = useMemo(() => data.members.filter((member) => matchesTeamStatFilter(member, statFilter)), [data.members, statFilter])
  const columns = useTeamColumns()
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns])
  const globalFilterFn = useMemo(
    () =>
      createCatalogTableGlobalFilterFn<User["adminTeamMember"]>((row) => [
        row.name,
        row.email,
        teamTwoFactorLabel(row, t),
        teamSignInMethods(row, t, format),
      ]),
    [format, t],
  )

  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: members,
    defaultPageSize: ADMIN_TEAM_PAGE_SIZE,
    enableRowSelection: false,
    getRowId: (row) => row.id,
    globalFilterFn,
    initialColumnOrder,
    initialColumnPinning: TEAM_TABLE_COLUMN_PINNING,
    persistenceKey: teamDataGrid.persistenceKey,
  })

  const applyStatFilter = useCallback(
    (filter?: TeamStatFilter) => {
      setStatFilter(filter)
      table.setPageIndex(0)
    },
    [table],
  )

  const exportSource = useMemo<DataGridExportSource<User["adminTeamMember"]>>(() => {
    const card = TEAM_STAT_CARDS.find((config) => config.filter !== undefined && config.filter === statFilter)

    return {
      filters: exportFilter(tGrid("export.filters.quickFilter"), card === undefined ? undefined : t(`stats.${card.key}`)),
      list: TEAM_EXPORT_LIST,
      title: t("admins.title"),
    }
  }, [statFilter, t, tGrid])

  return useMemo(
    () => ({
      activeStatFilter: statFilter,
      applyStatFilter,
      columnReorder,
      exportSource,
      hasPreferenceOverrides,
      isLoading: isFetching,
      persistenceKey: teamDataGrid.persistenceKey,
      resetPreferences,
      rowReorder: undefined,
      searchPlaceholder: t("searchPlaceholder"),
      table,
    }),
    [applyStatFilter, columnReorder, exportSource, hasPreferenceOverrides, isFetching, resetPreferences, statFilter, t, table],
  )
}

const isTeamDataGridValue = (value: DataGridContextValue<User["adminTeamMember"]>): value is TeamDataGridValue => "applyStatFilter" in value

export const useTeamDataGridContext = (): TeamDataGridValue => {
  const value = teamDataGrid.useDataGrid()
  if (!isTeamDataGridValue(value)) {
    throw new Error("useTeamDataGridContext must be used within the team table Provider.")
  }

  return value
}

export interface TeamDataGridValue extends DataGridContextValue<User["adminTeamMember"]> {
  readonly activeStatFilter: TeamStatFilter | undefined
  readonly applyStatFilter: (filter?: TeamStatFilter) => void
}
