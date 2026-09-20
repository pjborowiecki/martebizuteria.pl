import { type User } from "~/src/modules/user/user.types"
import { formatAdminCustomerLocation, resolveAdminCustomerInitials } from "~/src/modules/user/user.utils"

import { appendSearchPart } from "~/src/presentation/components/custom/datagrid/lib/catalog-table-global-filter"
const appendDateSearchPart = (parts: string[], value: Date | string | number | null | undefined): void => {
  if (value === null || value === undefined || value === "") {
    return
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return
  }
  appendSearchPart(parts, date.toISOString())
  appendSearchPart(parts, date.toLocaleDateString())
}
const appendCustomerIdentitySearchParts = (
  parts: string[],
  row: User["adminCustomerListItem"],
  labels: Pick<CustomerAdminSearchLabels, "bannedLabel" | "emailVerifiedLabel" | "roleLabel">,
): void => {
  const { bannedLabel, emailVerifiedLabel, roleLabel } = labels
  appendSearchPart(parts, row.name)
  appendSearchPart(parts, resolveAdminCustomerInitials(row.name))
  appendSearchPart(parts, row.email)
  appendSearchPart(parts, row.id)
  appendSearchPart(parts, row.stripeCustomerId)
  appendSearchPart(parts, row.phone)
  appendSearchPart(parts, row.role)
  appendSearchPart(parts, roleLabel)
  appendSearchPart(parts, emailVerifiedLabel)
  appendSearchPart(parts, bannedLabel)
}
const appendCustomerStatusSearchParts = (
  parts: string[],
  row: User["adminCustomerListItem"],
  labels: Pick<CustomerAdminSearchLabels, "locationLabel">,
): void => {
  const { locationLabel } = labels
  appendSearchPart(parts, locationLabel)
  appendSearchPart(
    parts,
    formatAdminCustomerLocation(
      row.city === undefined || row.countryCode === undefined
        ? undefined
        : {
            city: row.city,
            countryCode: row.countryCode,
            province: row.province,
          },
    ),
  )
}
const appendCustomerMetricsSearchParts = (parts: string[], row: User["adminCustomerListItem"]): void => {
  appendSearchPart(parts, row.orderCount)
  appendSearchPart(parts, row.totalSpent)
  appendSearchPart(parts, row.averageOrderValue)
  appendDateSearchPart(parts, row.lastOrderAt)
  appendDateSearchPart(parts, row.createdAt)
}
export const getCustomerAdminSearchParts = (row: User["adminCustomerListItem"], labels: CustomerAdminSearchLabels): string[] => {
  const parts: string[] = []
  appendCustomerIdentitySearchParts(parts, row, labels)
  appendCustomerStatusSearchParts(parts, row, labels)
  appendCustomerMetricsSearchParts(parts, row)
  return parts
}
interface CustomerAdminSearchLabels {
  readonly bannedLabel: string
  readonly emailVerifiedLabel: string
  readonly locationLabel: string | undefined
  readonly roleLabel: string
}
