import { createDataGrid } from "~/src/components/custom/datagrid/components/create-data-grid";

import type { AuditLog } from "~/src/modules/audit-log/audit-log.types";

export const AUDIT_DATA_GRID_KEY = "admin.audit";

export const auditDataGrid = createDataGrid<AuditLog["adminListItem"]>({
  persistenceKey: AUDIT_DATA_GRID_KEY
});
