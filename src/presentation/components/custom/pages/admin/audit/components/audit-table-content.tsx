import { type JSX, useMemo } from "react"

import { DataGridShell } from "~/src/presentation/components/custom/datagrid/components/data-grid-shell"
import { ADMIN_CATALOG_DATAGRID_PAGE_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { AuditBulkActions } from "~/src/presentation/components/custom/pages/admin/audit/components/audit-bulk-actions"
import { AuditDateFilter } from "~/src/presentation/components/custom/pages/admin/audit/components/audit-date-filter"
import { AuditCategoryFilter, AuditSeverityFilter } from "~/src/presentation/components/custom/pages/admin/audit/components/audit-filters"
import { AuditRefreshAction } from "~/src/presentation/components/custom/pages/admin/audit/components/audit-refresh-action"
import { AuditStats } from "~/src/presentation/components/custom/pages/admin/audit/components/audit-stats"
import { useAuditDataGrid } from "~/src/presentation/components/custom/pages/admin/audit/hooks/use-audit-data-grid"
import { auditDataGrid } from "~/src/presentation/components/custom/pages/admin/audit/utils/audit-data-grid"
const AuditTableToolbarActions = (): JSX.Element => <AuditBulkActions />

export const AuditTableContent = (): JSX.Element => {
  const grid = useAuditDataGrid()
  const toolbarActions = useMemo(() => <AuditTableToolbarActions />, [])
  return (
    <Provider value={grid}>
      <div className={ADMIN_CATALOG_DATAGRID_PAGE_CLASS}>
        <AuditStats />
        <DataGridShell>
          <Toolbar actions={toolbarActions}>
            <AuditRefreshAction />
            <AuditCategoryFilter />
            <AuditSeverityFilter />
            <AuditDateFilter />
          </Toolbar>
          <Body />
          <Pagination />
        </DataGridShell>
      </div>
    </Provider>
  )
}
const { Body, Pagination, Provider, Toolbar } = auditDataGrid
