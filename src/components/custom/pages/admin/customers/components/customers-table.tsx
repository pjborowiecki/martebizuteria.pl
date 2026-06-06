import { type JSX, useCallback } from "react";

import { useNavigate } from "@tanstack/react-router";

import { CONSTANTS } from "~/src/constants";

import { DataGridShell } from "~/src/components/custom/datagrid/components/data-grid-shell";
import { ADMIN_CATALOG_DATAGRID_PAGE_CLASS } from "~/src/components/custom/pages/admin/admin-layout.styles";
import { CustomersBannedFilter } from "~/src/components/custom/pages/admin/customers/components/customers-banned-filter";
import { CustomersDateColumnFilter } from "~/src/components/custom/pages/admin/customers/components/customers-date-column-filter";
import { CustomersEmailVerifiedFilter } from "~/src/components/custom/pages/admin/customers/components/customers-email-verified-filter";
import { CustomersExportAction } from "~/src/components/custom/pages/admin/customers/components/customers-export-action";
import { CustomersNumericColumnFilter } from "~/src/components/custom/pages/admin/customers/components/customers-numeric-column-filter";
import { CustomersRefreshAction } from "~/src/components/custom/pages/admin/customers/components/customers-refresh-action";
import { CustomersRoleFilter } from "~/src/components/custom/pages/admin/customers/components/customers-role-filter";
import { CustomersStats } from "~/src/components/custom/pages/admin/customers/components/customers-stats";
import { useCustomersDataGrid } from "~/src/components/custom/pages/admin/customers/hooks/use-customers-data-grid";
import { customersDataGrid } from "~/src/components/custom/pages/admin/customers/utils/customers-data-grid";

import { ADMIN_CUSTOMER_TABLE_COLUMN_ID } from "~/src/modules/user/user.constants";
import type { User } from "~/src/modules/user/user.types";

const { Body, Pagination, Provider, Toolbar } = customersDataGrid;

export function CustomersTableContent(): JSX.Element {
  const navigate = useNavigate();

  const handleRowClick = useCallback(
    (customer: User["adminCustomerListItem"]) => {
      void navigate({ params: { id: customer.id }, to: `/{-$locale}${CONSTANTS.ROUTES.ADMIN_CUSTOMER}` });
    },
    [navigate]
  );

  const grid = useCustomersDataGrid({ onRowClick: handleRowClick });

  return (
    <Provider value={grid}>
      <div className={ADMIN_CATALOG_DATAGRID_PAGE_CLASS}>
        <CustomersStats />
        <DataGridShell>
          <Toolbar
            filters={
              <>
                <CustomersRoleFilter />
                <CustomersEmailVerifiedFilter />
                <CustomersBannedFilter />
                <CustomersNumericColumnFilter
                  ariaLabelKey="filter.totalSpent"
                  columnId={ADMIN_CUSTOMER_TABLE_COLUMN_ID.totalSpent}
                  labelKey="columns.spent"
                />
                <CustomersNumericColumnFilter
                  ariaLabelKey="filter.averageOrderValue"
                  columnId={ADMIN_CUSTOMER_TABLE_COLUMN_ID.averageOrderValue}
                  labelKey="columns.averageOrderValue"
                />
                <CustomersDateColumnFilter
                  ariaLabelKey="filter.lastOrderAt"
                  columnId={ADMIN_CUSTOMER_TABLE_COLUMN_ID.lastOrderAt}
                  labelKey="columns.lastOrder"
                />
                <CustomersDateColumnFilter
                  ariaLabelKey="filter.createdAt"
                  columnId={ADMIN_CUSTOMER_TABLE_COLUMN_ID.createdAt}
                  labelKey="columns.createdAt"
                />
              </>
            }
          >
            <CustomersRefreshAction />
            <CustomersExportAction />
          </Toolbar>
          <Body />
          <Pagination />
        </DataGridShell>
      </div>
    </Provider>
  );
}

/** Customers list: filterable, paginated datagrid backed by registered users. */
export function CustomersTable(): JSX.Element {
  return <CustomersTableContent />;
}
