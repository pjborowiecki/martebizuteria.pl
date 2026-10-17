import { type JSX, useMemo } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { listAdminDeliveryMethodsQuery } from "~/src/modules/delivery-method/use-cases/list-admin-delivery-methods"

import { DataGridShell } from "~/src/presentation/components/custom/datagrid/components/data-grid-shell"
import { ADMIN_CATALOG_DATAGRID_PAGE_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { CatalogToolbarAddButton } from "~/src/presentation/components/custom/pages/admin/catalog/toolbar/components/catalog-toolbar-add-button"
import { DeliveryMethodsRefreshAction } from "~/src/presentation/components/custom/pages/admin/settings/delivery/components/delivery-methods-refresh-action"
import { DeliveryMethodsStats } from "~/src/presentation/components/custom/pages/admin/settings/delivery/components/delivery-methods-stats"
import { DeliveryMethodsStatusFilter } from "~/src/presentation/components/custom/pages/admin/settings/delivery/components/delivery-methods-status-filter"
import { DeliveryMethodSheet } from "~/src/presentation/components/custom/pages/admin/settings/delivery/delivery-method-sheet"
import {
  DeliveryMethodSheetProvider,
  useDeliveryMethodSheet,
  useDeliveryMethodSheetState,
} from "~/src/presentation/components/custom/pages/admin/settings/delivery/hooks/use-delivery-method-sheet"
import { useDeliveryMethodsDataGrid } from "~/src/presentation/components/custom/pages/admin/settings/delivery/hooks/use-delivery-methods-data-grid"
import { deliveryMethodsDataGrid } from "~/src/presentation/components/custom/pages/admin/settings/delivery/utils/delivery-methods-data-grid"

const DeliveryMethodsToolbarActions = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.delivery")
  const { openCreate } = useDeliveryMethodSheet()

  return <CatalogToolbarAddButton onClick={openCreate}>{t("actions.add")}</CatalogToolbarAddButton>
}

const DeliveryMethodsTableContent = (): JSX.Element => {
  const sheet = useDeliveryMethodSheet()
  const { data } = useSuspenseQuery(listAdminDeliveryMethodsQuery())
  const grid = useDeliveryMethodsDataGrid({ onRowClick: sheet.openEdit })
  const toolbarActions = useMemo(() => <DeliveryMethodsToolbarActions />, [])

  return (
    <>
      <Provider value={grid}>
        <div className={ADMIN_CATALOG_DATAGRID_PAGE_CLASS}>
          <DeliveryMethodsStats />
          <DataGridShell>
            <Toolbar actions={toolbarActions}>
              <DeliveryMethodsRefreshAction />
              <Export />
              <DeliveryMethodsStatusFilter />
            </Toolbar>
            <Body />
            <Pagination />
          </DataGridShell>
        </div>
      </Provider>

      {sheet.state.open && (
        <DeliveryMethodSheet
          couriers={data.couriers}
          key={sheet.state.method?.id ?? "new"}
          method={sheet.state.method}
          onClose={sheet.close}
        />
      )}
    </>
  )
}

export const DeliveryMethodsTable = (): JSX.Element => {
  const sheetState = useDeliveryMethodSheetState()

  return (
    <DeliveryMethodSheetProvider value={sheetState}>
      <DeliveryMethodsTableContent />
    </DeliveryMethodSheetProvider>
  )
}

const { Body, Export, Pagination, Provider, Toolbar } = deliveryMethodsDataGrid
