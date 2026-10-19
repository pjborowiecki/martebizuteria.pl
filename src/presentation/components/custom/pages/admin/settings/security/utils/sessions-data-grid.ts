import { type Session } from "~/src/modules/session/session.types"

import { createDataGrid } from "~/src/presentation/components/custom/datagrid/components/create-data-grid"

export const SESSIONS_DATA_GRID_KEY = "admin.settings.sessions:v1"

export const sessionsDataGrid = createDataGrid<Session["customerSession"]>({
  persistenceKey: SESSIONS_DATA_GRID_KEY,
})
