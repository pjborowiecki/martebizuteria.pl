import { type JSX } from "react"

import { type User } from "~/src/modules/user/user.types"

import { CustomerCharts } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-charts"
import { CUSTOMER_DETAIL_COLUMN_CLASS } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-detail.styles"
import { CustomerKpis } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-kpis"
import { CustomerOrders } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-orders"
import { CustomerSidebar } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/customer-sidebar"

export const CustomerDetailPage = ({ customer }: Readonly<CustomerDetailPageProps>): JSX.Element => (
  <div className="min-h-0 flex-1 overflow-y-auto p-8 2xl:[@media(min-height:57rem)]:flex 2xl:[@media(min-height:57rem)]:flex-col 2xl:[@media(min-height:57rem)]:overflow-hidden">
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:[@media(min-height:57rem)]:min-h-0 2xl:[@media(min-height:57rem)]:flex-1 2xl:[@media(min-height:57rem)]:grid-rows-[minmax(0,1fr)]">
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
