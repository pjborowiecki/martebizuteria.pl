import { type JSX } from "react"

import { cn } from "cn"

import { type User } from "~/src/modules/user/user.types"

import { ADMIN_PAGE_BODY_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { CUSTOMER_DETAIL_COLUMN_CLASS } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/_styles/customer-detail.styles"
import { CustomerCharts } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-charts"
import { CustomerKpis } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-kpis"
import { CustomerOrders } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-orders"
import { CustomerSidebar } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-sidebar"

export const CustomerDetailPage = ({ customer }: Readonly<CustomerDetailPageProps>): JSX.Element => (
  <div
    className={cn(
      ADMIN_PAGE_BODY_CLASS,
      "2xl:[@media(min-height:57rem)]:flex 2xl:[@media(min-height:57rem)]:flex-col 2xl:[@media(min-height:57rem)]:overflow-hidden",
    )}
  >
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:gap-6 lg:gap-8 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:[@media(min-height:57rem)]:min-h-0 2xl:[@media(min-height:57rem)]:flex-1 2xl:[@media(min-height:57rem)]:grid-rows-[minmax(0,1fr)]">
      <div className={CUSTOMER_DETAIL_COLUMN_CLASS}>
        <CustomerKpis customer={customer} />
        <CustomerCharts customer={customer} />
        <CustomerOrders customerId={customer.id} />
      </div>

      <CustomerSidebar customer={customer} />
    </div>
  </div>
)

interface CustomerDetailPageProps {
  readonly customer: User["adminCustomerDetail"]
}
