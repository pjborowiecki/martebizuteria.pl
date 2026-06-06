import type { JSX } from "react";

import { DataGridShell } from "~/src/components/custom/datagrid/components/data-grid-shell";
import { ADMIN_CATALOG_DATAGRID_PAGE_CLASS } from "~/src/components/custom/pages/admin/admin-layout.styles";
import {
  AuditCategoryFilter,
  AuditDateRangeFilter,
  AuditSeverityFilter
} from "~/src/components/custom/pages/admin/audit/components/audit-filters";
import { AuditStats } from "~/src/components/custom/pages/admin/audit/components/audit-stats";
import { useAuditDataGrid } from "~/src/components/custom/pages/admin/audit/hooks/use-audit-data-grid";
import { auditDataGrid } from "~/src/components/custom/pages/admin/audit/utils/audit-data-grid";

const { Body, Pagination, Provider, Toolbar } = auditDataGrid;

export function AuditTableContent(): JSX.Element {
  const grid = useAuditDataGrid();

  return (
    <Provider value={grid}>
      <div className={ADMIN_CATALOG_DATAGRID_PAGE_CLASS}>
        <AuditStats />
        <DataGridShell>
          <Toolbar
            filters={
              <>
                <AuditCategoryFilter />
                <AuditSeverityFilter />
                <AuditDateRangeFilter />
              </>
            }
          />
          <Body />
          <Pagination />
        </DataGridShell>
      </div>
    </Provider>
  );
}
