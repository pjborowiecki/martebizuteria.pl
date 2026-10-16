import { useMemo } from "react"

import { useTranslations } from "use-intl/react"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import { exportAdminCustomers } from "~/src/modules/user/use-cases/export-admin-customers"
import {
  ADMIN_CUSTOMER_BOOLEAN_LABEL_KEYS,
  ADMIN_CUSTOMER_ROLE_LABEL_KEYS,
  type AdminCustomerStatFilter,
  DEFAULT_ADMIN_CUSTOMER_CURRENCY,
} from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

import { useFormatLocale } from "~/src/hooks/use-display-format"

import {
  type DataGridExportSource,
  describeAmountFilter,
  describeDateFilter,
  exportFilter,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-export"
import { useAdminDateFilterDay } from "~/src/presentation/components/custom/pages/admin/lib/use-admin-date-filter-day"

export const CUSTOMERS_EXPORT_LIST = "customers"

const CUSTOMER_STAT_FILTER_LABEL_KEYS: Readonly<Record<AdminCustomerStatFilter, string>> = {
  returning: "stats.returningRate.label",
  total: "stats.total.label",
}

const yesNoKey = (value: boolean): string => (value ? ADMIN_CUSTOMER_BOOLEAN_LABEL_KEYS.yes : ADMIN_CUSTOMER_BOOLEAN_LABEL_KEYS.no)

export const useCustomersExportSource = (input: User["adminCustomersExportInput"]): DataGridExportSource<User["adminCustomerListItem"]> => {
  const t = useTranslations("pages.admin.customers")
  const tGrid = useTranslations("components.datagrid")
  const formatLocale = useFormatLocale()
  const { formatIsoDateLabel } = useAdminDateFilterDay()

  return useMemo(() => {
    const formatAmount = (amount: number): string => formatPrice(amount, DEFAULT_ADMIN_CUSTOMER_CURRENCY, formatLocale)
    const describeAmount = (filter: typeof input.totalSpent): string | undefined =>
      filter === undefined ? undefined : describeAmountFilter(filter, formatAmount, tGrid)
    const describeDate = (filter: typeof input.createdAt): string | undefined =>
      filter === undefined ? undefined : describeDateFilter(filter, formatIsoDateLabel, tGrid)

    return {
      filters: [
        ...exportFilter(
          tGrid("export.filters.quickFilter"),
          input.statFilter === undefined ? undefined : t(CUSTOMER_STAT_FILTER_LABEL_KEYS[input.statFilter]),
        ),
        ...exportFilter(
          t("columns.role"),
          input.role === undefined
            ? undefined
            : t(input.role === ROLES.ADMIN ? ADMIN_CUSTOMER_ROLE_LABEL_KEYS.admin : ADMIN_CUSTOMER_ROLE_LABEL_KEYS.customer),
        ),
        ...exportFilter(t("columns.emailVerified"), input.emailVerified === undefined ? undefined : t(yesNoKey(input.emailVerified))),
        ...exportFilter(t("columns.banned"), input.banned === undefined ? undefined : t(yesNoKey(input.banned))),
        ...exportFilter(t("columns.spent"), describeAmount(input.totalSpent)),
        ...exportFilter(t("columns.averageOrderValue"), describeAmount(input.averageOrderValue)),
        ...exportFilter(t("columns.lastOrder"), describeDate(input.lastOrderAt)),
        ...exportFilter(t("columns.createdAt"), describeDate(input.createdAt)),
      ],
      list: CUSTOMERS_EXPORT_LIST,
      loadRows: () => exportAdminCustomers({ data: input }),
      search: input.search,
      title: t("title"),
    }
  }, [formatIsoDateLabel, formatLocale, input, t, tGrid])
}
