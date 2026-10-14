import { type JSX, useMemo } from "react"

import { useTranslations } from "use-intl/react"

import { DataGridShell } from "~/src/presentation/components/custom/datagrid/components/data-grid-shell"
import { ADMIN_CATALOG_DATAGRID_PAGE_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { CatalogToolbarAddButton } from "~/src/presentation/components/custom/pages/admin/catalog/toolbar/components/catalog-toolbar-add-button"
import { CouponsBulkActions } from "~/src/presentation/components/custom/pages/admin/coupons/components/coupons-bulk-actions"
import { CouponsStatusFilter, CouponsTypeFilter } from "~/src/presentation/components/custom/pages/admin/coupons/components/coupons-filters"
import { CouponsRefreshAction } from "~/src/presentation/components/custom/pages/admin/coupons/components/coupons-refresh-action"
import { CouponsStats } from "~/src/presentation/components/custom/pages/admin/coupons/components/coupons-stats"
import { CouponSheet } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-sheet"
import { useCouponsDataGrid } from "~/src/presentation/components/custom/pages/admin/coupons/hooks/use-coupons-data-grid"
import { useCouponsSheet } from "~/src/presentation/components/custom/pages/admin/coupons/hooks/use-coupons-sheet"
import { couponsDataGrid } from "~/src/presentation/components/custom/pages/admin/coupons/utils/coupons-data-grid"

const CouponsToolbarActions = (): JSX.Element => {
  const t = useTranslations("pages.admin.coupons")
  const { openCreate } = useCouponsSheet()

  return (
    <>
      <CouponsBulkActions />
      <CatalogToolbarAddButton onClick={openCreate}>{t("actions.createCoupon")}</CatalogToolbarAddButton>
    </>
  )
}

export const CouponsTableContent = (): JSX.Element => {
  const sheet = useCouponsSheet()
  const grid = useCouponsDataGrid({ onRowClick: sheet.openEdit })
  const toolbarActions = useMemo(() => <CouponsToolbarActions />, [])
  const toolbarFilters = useMemo(
    () => (
      <>
        <CouponsStatusFilter />
        <CouponsTypeFilter />
      </>
    ),
    [],
  )

  return (
    <>
      <Provider value={grid}>
        <div className={ADMIN_CATALOG_DATAGRID_PAGE_CLASS}>
          <CouponsStats />
          <DataGridShell>
            <Toolbar actions={toolbarActions} filters={toolbarFilters}>
              <CouponsRefreshAction />
            </Toolbar>
            <Body />
            <Pagination />
          </DataGridShell>
        </div>
      </Provider>

      {sheet.open && (
        <CouponSheet coupon={sheet.coupon} mode={sheet.mode === "edit" ? "edit" : "create"} onOpenChange={sheet.setOpen} open />
      )}
    </>
  )
}

const { Body, Pagination, Provider, Toolbar } = couponsDataGrid
