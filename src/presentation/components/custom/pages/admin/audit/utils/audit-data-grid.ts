import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"

import { createDataGrid } from "~/src/presentation/components/custom/datagrid/components/create-data-grid"

export const AUDIT_DATA_GRID_KEY = "admin.audit:v3"

export const auditDataGrid = createDataGrid<AuditLog["adminListItem"]>({
  persistenceKey: AUDIT_DATA_GRID_KEY,
})
