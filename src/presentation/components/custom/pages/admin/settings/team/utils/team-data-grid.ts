import { type User } from "~/src/modules/user/user.types"

import { createDataGrid } from "~/src/presentation/components/custom/datagrid/components/create-data-grid"

export const TEAM_DATA_GRID_KEY = "admin.settings.team:v1"

export const teamDataGrid = createDataGrid<User["adminTeamMember"]>({
  persistenceKey: TEAM_DATA_GRID_KEY,
})
