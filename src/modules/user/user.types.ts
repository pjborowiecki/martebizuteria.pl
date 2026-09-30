import { type z } from "zod/v4"

import { type ROLES } from "~/src/integrations/better-auth/auth.access"

import { type DateColumnFilterValue, type NumericColumnFilterValue } from "~/src/modules/_core/utils/column-filters"
import { type NumericInput } from "~/src/modules/_core/utils/datetime"
import { type address } from "~/src/modules/address/address.schema"
import { type auditLog } from "~/src/modules/audit-log/audit-log.schema"
import { type order } from "~/src/modules/order/order.schema"
import { type AdminCustomerStatFilter } from "~/src/modules/user/user.constants"
import { type user } from "~/src/modules/user/user.schema"
import { type userZodSchemas } from "~/src/modules/user/user.zod"

type CustomerAddressRow = Pick<typeof address.$inferSelect, "city" | "countryCode"> & {
  readonly province?: string | null | undefined
}

type AdminCustomerFullAddressRow = Pick<
  typeof address.$inferSelect,
  "address1" | "address2" | "city" | "countryCode" | "postalCode" | "province"
>

type AdminCustomerTimelineOrder = Pick<typeof order.$inferSelect, "createdAt" | "currencyCode" | "id" | "total">

type AdminCustomerAuditTimelineRow = Pick<typeof auditLog.$inferSelect, "action" | "createdAt" | "detail" | "metadata">

interface CustomerOrderStats {
  readonly lastOrderAt?: Date | undefined
  readonly orderCount: number
  readonly totalSpent: number
}

interface AdminCustomerAggregateStatsInput {
  readonly averageLtv: NumericInput
  readonly averageProductsPerOrder: NumericInput
  readonly customersWithOrders: NumericInput
  readonly repeatCustomers: NumericInput
  readonly total: NumericInput
}

interface AdminCustomerTimelineInput {
  readonly auditEvents?: readonly AdminCustomerAuditTimelineRow[] | undefined
  readonly createdAt: Date
  readonly locale: string
  readonly orders: readonly AdminCustomerTimelineOrder[]
}

interface AdminCustomersListFilters {
  readonly averageOrderValue?: NumericColumnFilterValue | undefined
  readonly banned?: boolean | undefined
  readonly createdAt?: DateColumnFilterValue | undefined
  readonly emailVerified?: boolean | undefined
  readonly lastOrderAt?: DateColumnFilterValue | undefined
  readonly role?: (typeof ROLES)[keyof typeof ROLES] | undefined
  readonly totalSpent?: NumericColumnFilterValue | undefined
}

type AdminCustomersPageInput = AdminCustomersListFilters & {
  readonly page?: number | undefined
  readonly pageSize?: number | undefined
  readonly search?: string | undefined
  readonly statFilter?: AdminCustomerStatFilter | undefined
}

export interface User {
  adminCustomerAddressForm: z.infer<(typeof userZodSchemas)["adminCustomerAddressForm"]>
  adminCustomerAggregateStatsInput: AdminCustomerAggregateStatsInput
  adminCustomerAuditTimelineRow: AdminCustomerAuditTimelineRow
  adminCustomerDetail: z.infer<(typeof userZodSchemas)["adminCustomerDetail"]>
  adminCustomerFormValues: z.infer<(typeof userZodSchemas)["adminCustomerFormValues"]>
  adminCustomerFullAddressRow: AdminCustomerFullAddressRow
  adminCustomerListItem: z.infer<(typeof userZodSchemas)["adminCustomerListItem"]>
  adminCustomerStats: z.infer<(typeof userZodSchemas)["adminCustomerStats"]>
  adminCustomerTimelineInput: AdminCustomerTimelineInput
  adminCustomerTimelineOrder: AdminCustomerTimelineOrder
  adminCustomersExportInput: Omit<AdminCustomersPageInput, "page" | "pageSize">
  adminCustomersListFilters: AdminCustomersListFilters
  adminCustomersPageInput: AdminCustomersPageInput
  adminUserMetadata: z.infer<(typeof userZodSchemas)["adminUserMetadata"]>
  customerAddressRow: CustomerAddressRow
  customerOrderStats: CustomerOrderStats
  insert: typeof user.$inferInsert
  select: typeof user.$inferSelect
}
