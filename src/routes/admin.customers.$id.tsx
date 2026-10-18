import { type JSX, useCallback, useMemo, useState } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, notFound } from "@tanstack/react-router"
import { Mail, Pencil } from "lucide-react"
import { useLocale, useTranslations } from "use-intl/react"

import { hasAdminAccess } from "~/src/integrations/better-auth/auth.access"

import { getAdminOrdersPageQuery } from "~/src/modules/order/use-cases/get-admin-orders-page"
import { getAdminCustomerQuery } from "~/src/modules/user/use-cases/get-admin-customer"
import { ADMIN_CUSTOMER_QUERY_STALE_MS } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

import { Button } from "~/src/presentation/components/shadcn/button"

import { type LocalizedTo } from "~/src/presentation/components/custom/localized-link"
import { ADMIN_HEADER_SECONDARY_BUTTON_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { AdminHeader } from "~/src/presentation/components/custom/pages/admin/admin-header"
import { CustomerDetailPage } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-detail-page"
import { CustomerEmailChangeSheet } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-email-change-sheet"
import { CustomerSheet } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-sheet"
import { CUSTOMER_ORDERS_VIEW } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/utils/customer-orders-data-grid"
import { OrderActionButton } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-action-button"

import { ROUTES } from "~/src/routes"

const AdminCustomerDetailRoute = (): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail")
  const locale = useLocale()
  const { id } = Route.useParams()
  const { data } = useSuspenseQuery(getAdminCustomerQuery(id, locale))
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
  const [changingEmail, setChangingEmail] = useState(false)
  const handleChangeEmailClick = useCallback(() => {
    setChangingEmail(true)
  }, [])
  const handleChangeEmailClose = useCallback(() => {
    setChangingEmail(false)
  }, [])

  const headerActions = useMemo(
    () => (
      <>
        {!hasAdminAccess(customer.role) && (
          <OrderActionButton
            blockedReason={customer.signedInOrderCount === 0 ? t("actions.changeEmailBlocked") : undefined}
            isPending={false}
            onClick={handleChangeEmailClick}
          >
            <Mail className="size-3.5" strokeWidth={1.5} />
            {t("actions.changeEmail")}
          </OrderActionButton>
        )}
        <Button type="button" variant="outline" size="sm" className={ADMIN_HEADER_SECONDARY_BUTTON_CLASS} onClick={handleEditClick}>
          <Pencil className="size-3.5" strokeWidth={1.5} />
          {t("actions.edit")}
        </Button>
      </>
    ),
    [customer.role, customer.signedInOrderCount, handleChangeEmailClick, handleEditClick, t],
  )

  return (
    <>
      <AdminHeader backHref={ROUTES.ADMIN_CUSTOMERS} title={customer.name} breadcrumbs={breadcrumbs} actions={headerActions} />

      <CustomerDetailPage customer={customer} />

      {sheetOpen && <CustomerSheet customer={customer} open onOpenChange={setSheetOpen} />}
      {changingEmail && <CustomerEmailChangeSheet customer={customer} onClose={handleChangeEmailClose} />}
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

export const Route = createFileRoute("/admin/customers/$id")({
  component: AdminCustomerDetailRoute,
  loader: async ({ context, params }) => {
    const { locale } = context
    await Promise.all([
      context.queryClient.query({
        ...getAdminCustomerQuery(params.id, locale),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...getAdminOrdersPageQuery({
          page: 1,
          pageSize: CUSTOMER_ORDERS_VIEW.pageSize,
          userId: params.id,
        }),
        staleTime: "static",
      }),
    ])
  },
  shouldReload: false,
  staleTime: ADMIN_CUSTOMER_QUERY_STALE_MS,
  staticData: {
    namespaces: ["pages.admin.customers"],
  },
})
