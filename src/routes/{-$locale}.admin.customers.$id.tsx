import { type JSX, useCallback, useMemo, useState } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, notFound } from "@tanstack/react-router"
import { Pencil } from "lucide-react"
import { useLocale, useTranslations } from "use-intl"

import { adminCustomerByIdQueryOptions } from "~/src/modules/user/use-cases/get-admin-customer"
import { ADMIN_CUSTOMER_QUERY_STALE_MS } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

import { Button } from "~/src/presentation/components/shadcn/button"

import { type LocalizedTo } from "~/src/presentation/components/custom/localized-link"
import { AdminHeader } from "~/src/presentation/components/custom/pages/admin/admin-header"
import { CustomerCharts } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-charts"
import { CustomerKpis } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-kpis"
import { CustomerOrders } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-orders"
import { CustomerSidebar } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-sidebar"
import { CustomerSheet } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-sheet"

import { ROUTES } from "~/src/routes"
const AdminCustomerDetailRoute = (): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail")
  const locale = useLocale()
  const { id } = Route.useParams()
  const { data } = useSuspenseQuery(adminCustomerByIdQueryOptions(id, locale))
  const customer = ensureAdminCustomerDetail(data)
  const breadcrumbs = useMemo(
    () => [
      {
        href: ROUTES.ADMIN,
        label: t("breadcrumb.dashboard"),
      } satisfies {
        href: LocalizedTo
        label: string
      },
      {
        href: ROUTES.ADMIN_CUSTOMERS,
        label: t("breadcrumb.customers"),
      } satisfies {
        href: LocalizedTo
        label: string
      },
    ],
    [t],
  )
  const [sheetOpen, setSheetOpen] = useState(false)
  const handleEditClick = useCallback(() => {
    setSheetOpen(true)
  }, [])
  const headerActions = useMemo(
    () => (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 border-sidebar-border bg-sidebar px-3 text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        onClick={handleEditClick}
      >
        <Pencil className="size-3.5" strokeWidth={1.5} />
        {t("actions.edit")}
      </Button>
    ),
    [handleEditClick, t],
  )
  return (
    <>
      <AdminHeader backHref={ROUTES.ADMIN_CUSTOMERS} title={customer.name} breadcrumbs={breadcrumbs} actions={headerActions} />

      <div className="min-h-0 flex-1 overflow-y-auto p-8">
        <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
          <div className="space-y-8">
            <CustomerKpis customer={customer} />
            <CustomerCharts customer={customer} />
            <CustomerOrders customer={customer} />
          </div>

          <CustomerSidebar customer={customer} />
        </div>
      </div>

      {sheetOpen && <CustomerSheet customer={customer} open onOpenChange={setSheetOpen} />}
    </>
  )
}
const ensureAdminCustomerDetail = (customer: User["adminCustomerDetail"] | undefined): User["adminCustomerDetail"] => {
  if (customer === undefined) {
    notFound({
      throw: true,
    })
    throw new Error("Customer not found")
  }
  return customer
}
export const Route = createFileRoute("/{-$locale}/admin/customers/$id")({
  component: AdminCustomerDetailRoute,
  loader: async ({ context, params }) => {
    const { locale } = context
    const customer = await context.queryClient.query({
      ...adminCustomerByIdQueryOptions(params.id, locale),
      staleTime: "static",
    })
    if (customer === undefined) {
      notFound({
        throw: true,
      })
    }
  },
  shouldReload: false,
  staleTime: ADMIN_CUSTOMER_QUERY_STALE_MS,
  staticData: {
    namespaces: ["pages.admin.customers"],
  },
})
