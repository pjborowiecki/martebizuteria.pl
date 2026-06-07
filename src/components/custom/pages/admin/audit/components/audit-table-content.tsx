import { type JSX, useMemo } from "react";

import { DataGridShell } from "~/src/components/custom/datagrid/components/data-grid-shell";
import { ADMIN_CATALOG_DATAGRID_PAGE_CLASS } from "~/src/components/custom/pages/admin/admin-layout.styles";
import { AuditBulkActions } from "~/src/components/custom/pages/admin/audit/components/audit-bulk-actions";
import { AuditDateFilter } from "~/src/components/custom/pages/admin/audit/components/audit-date-filter";
import { AuditCategoryFilter, AuditSeverityFilter } from "~/src/components/custom/pages/admin/audit/components/audit-filters";
import { AuditRefreshAction } from "~/src/components/custom/pages/admin/audit/components/audit-refresh-action";
import { AuditStats } from "~/src/components/custom/pages/admin/audit/components/audit-stats";
import { useAuditDataGrid } from "~/src/components/custom/pages/admin/audit/hooks/use-audit-data-grid";
import { auditDataGrid } from "~/src/components/custom/pages/admin/audit/utils/audit-data-grid";

const { Body, Pagination, Provider, Toolbar } = auditDataGrid;

function AuditTableToolbarActions(): JSX.Element {
  return <AuditBulkActions />;
}

export function AuditTableContent(): JSX.Element {
  const grid = useAuditDataGrid();
  const toolbarActions = useMemo(() => <AuditTableToolbarActions />, []);

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
  );
}
