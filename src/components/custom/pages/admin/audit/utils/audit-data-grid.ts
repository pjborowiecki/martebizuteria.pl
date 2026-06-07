import { createDataGrid } from "~/src/components/custom/datagrid/components/create-data-grid";

import type { AuditLog } from "~/src/modules/audit-log/audit-log.types";

/** Bumped when column layout/resize semantics change so stale localStorage widths are not reused. */
export const AUDIT_DATA_GRID_KEY = "admin.audit:v3";

export const auditDataGrid = createDataGrid<AuditLog["adminListItem"]>({
  persistenceKey: AUDIT_DATA_GRID_KEY
});
